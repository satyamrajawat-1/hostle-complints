import { asyncHandler } from "../utility/AsyncHandler.js";
import { ApiError } from "../utility/ApiError.js";
import { ApiResponse } from "../utility/ApiResponse.js";
import { prisma } from "../lib/prisma.js";
import { uploadOnCloudinary } from "../utility/cloudinary.js"
import type { UploadApiErrorResponse } from "cloudinary";
import { deleteFromCloudinary } from "../utility/deleteFromCloudinary.js";

const createComplaint = asyncHandler(async (req, res) => {
    const { title, description, location, category } = req.body;
    if ([title, description, location, category].some((f) => !f)) {
        throw new ApiError(400, "All fields are required");
    }
    const userId = req.user?.id;
    if (!userId) {
        throw new ApiError(401, "Unauthorized")
    }
    const localPath = req.file?.path || null;
    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;
    if (localPath) {
        const result = await uploadOnCloudinary(localPath);
        if (!result) {
            throw new ApiError(500, "Error uploading image")
        }
        else {
            imageUrl = result.secure_url;
            imagePublicId = result.public_id;
        }
    }
    const complaint = await prisma.complaint.create({
        data: {
            title,
            description,
            location,
            category,
            imageUrl,
            imagePublicId,
            studentId: userId,
        },
    });
    if (!complaint) {
        throw new ApiError(500, "Error creating complaint")
    }
    return res
        .status(201)
        .json(
            new ApiResponse(201, "Complaint created successfully", {
                complaint,
            })
        );

});

const updateComplaintStatus = asyncHandler(async (req, res) => {
    const { complaintId, status } = req.body;
    if (!complaintId || !status) {
        throw new ApiError(400, "Complaint ID and status are required");
    }
    const userId = req.user?.id;
    if (!userId) {
        throw new ApiError(401, "Unauthorized")
    }
    const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
    });
    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }
    if (complaint.assignedToId !== userId) {
        throw new ApiError(403, "You are not assigned to this complaint");
    }
    const updatedComplaint = await prisma.complaint.update({
        where: { id: complaintId },
        data: { status },
    });
    return res
        .status(200)
        .json(
            new ApiResponse(200, "Complaint status updated successfully", {
                updatedComplaint,
            })
        );
});

const acceptComplaint = asyncHandler(async (req, res) => {
    const { complaintId } = req.body;
    if (!complaintId) {
        throw new ApiError(400, "Complaint ID is required");
    }
    const userId = req.user?.id;
    if (!userId) {
        throw new ApiError(401, "Unauthorized")
    }
    const existing = await prisma.complaint.findUnique({ where: { id: complaintId } })

    if (!existing) throw new ApiError(404, "Complaint not found")

    if (existing.assignedToId) {
        throw new ApiError(409, "Complaint already assigned to another worker")
    }

    const complaint = await prisma.complaint.update({
        where: { id: complaintId },
        data: { status: "IN_PROGRESS", assignedToId: userId },
    });
    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, "Complaint accepted successfully", {
                complaint,
            })
        );
});

const getAllComplaints = asyncHandler(async (req, res) => {
    const userId = req.user?.id
    const role = req.user?.role

    if (!userId || !role) {
        throw new ApiError(401, "Unauthorized")
    }

    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const skip = (page - 1) * limit

    let whereCondition = {}

    if (role === "STUDENT") {
        whereCondition = { studentId: userId }
    }
    else if (role === "WORKER") {
        whereCondition = { assignedToId: userId }
    }
    else if (role === "WARDEN" || role === "STAFF") {
        whereCondition = {}
    }
    else {
        throw new ApiError(403, "Forbidden")
    }

    const [complaints, totalComplaints] = await Promise.all([
        prisma.complaint.findMany({
            where: whereCondition,
            take: limit,
            skip: skip,
            orderBy: { createdAt: "desc" },
            include: {
                student: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } },
                feedback: true
            }
        }),
        prisma.complaint.count({ where: whereCondition })
    ])

    return res.status(200).json(
        new ApiResponse(200, "Complaints fetched successfully", {
            complaints,
            pagination: {
                total: totalComplaints,
                page,
                limit,
                totalPages: Math.ceil(totalComplaints / limit)
            }
        })
    )
})

const getComplaintById = asyncHandler(async (req, res) => {
  const { complaintId } = req.params
  const userId = req.user?.id
  const role = req.user?.role

  if (!complaintId) {
    throw new ApiError(400, "Complaint ID is required")
  }

  if (!userId || !role) {
    throw new ApiError(401, "Unauthorized")
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId as string },
    include: {
      student: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      feedback: true
    }
  })

  if (!complaint) {
    throw new ApiError(404, "Complaint not found")
  }

  if (role === "STUDENT" && complaint.studentId !== userId) {
    throw new ApiError(403, "Forbidden")
  }

  if (role === "WORKER" && complaint.assignedToId !== userId) {
    throw new ApiError(403, "Forbidden")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Complaint fetched successfully", complaint))
})

const deleteComplaint = asyncHandler(async (req, res) => {
  const { complaintId } = req.params
  const userId = req.user?.id
  const role = req.user?.role

  if (!complaintId) {
    throw new ApiError(400, "Complaint ID is required")
  }

  if (!userId || !role) {
    throw new ApiError(401, "Unauthorized")
  }

  if (role !== "WARDEN" && role !== "STAFF") {
    throw new ApiError(403, "Forbidden")
  }

  const existing = await prisma.complaint.findUnique({
    where: { id: complaintId as string }
  })

  if (!existing) {
    throw new ApiError(404, "Complaint not found")
  }

  if (existing.imagePublicId) {
    try {
      await deleteFromCloudinary(existing.imagePublicId)
    } catch (err) {
      console.warn("Cloudinary delete failed, continuing DB delete")
    }
  }

  await prisma.$transaction([
    prisma.feedback.deleteMany({
      where: { complaintId : complaintId as string }
    }),
    prisma.complaint.delete({
      where: { id: complaintId as string }
    })
  ])
    
  return res
    .status(200)
    .json(new ApiResponse(200, "Complaint deleted successfully", null))
})

const complaintStats = asyncHandler(async (req, res) => {
  const userId = req.user?.id
  const role = req.user?.role

  if (!userId || !role) {
    throw new ApiError(401, "Unauthorized")
  }

  if (role !== "WARDEN" && role !== "STAFF") {
    throw new ApiError(403, "Forbidden")
  }

  const stats = await prisma.complaint.groupBy({
    by: ["status"],
    _count: { status: true }
  })

  const totalComplaints = stats.reduce((acc, cur) => acc + cur._count.status, 0)

  const response = {
    totalComplaints,
    pendingComplaints: stats.find(s => s.status === "PENDING")?._count.status || 0,
    inProgressComplaints: stats.find(s => s.status === "IN_PROGRESS")?._count.status || 0,
    resolvedComplaints: stats.find(s => s.status === "RESOLVED")?._count.status || 0
  }

  return res.status(200).json(
    new ApiResponse(200, "Complaint stats fetched successfully", response)
  )
})

const reopenComplaint = asyncHandler(async (req, res) => {
  const { complaintId } = req.params
  const { rating, comment } = req.body
  const userId = req.user?.id
  const role = req.user?.role

  if (!complaintId || !rating) {
    throw new ApiError(400, "Complaint ID and rating are required")
  }

  if (!userId || role !== "STUDENT") {
    throw new ApiError(403, "Only students can reopen complaints")
  }

  if (rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5")
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId as string}
  })

  if (!complaint) {
    throw new ApiError(404, "Complaint not found")
  }

  if (complaint.studentId !== userId) {
    throw new ApiError(403, "You can only reopen your own complaint")
  }

  if (complaint.status !== "RESOLVED") {
    throw new ApiError(400, "Only resolved complaints can be reopened")
  }

  await prisma.complaint.update({
    where: { id: complaintId as string },
    data: { status: "REOPENED" }
  })

  await prisma.feedback.upsert({
    where: { complaintId : complaintId as string },
    update: { rating, comment },
    create: {
      complaintId : complaintId as string,
      rating,
      comment,
      studentId: userId
    }
  })

  return res.status(200).json(
    new ApiResponse(200, "Complaint reopened successfully", null)
  )
})








export {
    createComplaint,
    updateComplaintStatus,
    acceptComplaint,
    getAllComplaints,
    getComplaintById,
    deleteComplaint,
    complaintStats,
    reopenComplaint
}
