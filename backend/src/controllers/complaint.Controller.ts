import { asyncHandler } from "../utility/AsyncHandler.js";
import { ApiError } from "../utility/ApiError.js";
import { ApiResponse } from "../utility/ApiResponse.js";
import { prisma } from "../lib/prisma.js";
import { uploadOnCloudinary } from "../utility/cloudinary.js"
import type { UploadApiErrorResponse } from "cloudinary";


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
    if (localPath) {
        const result = await uploadOnCloudinary(localPath);
        if (!result) {
            throw new ApiError(500, "Error uploading image")
        }
        else {
            imageUrl = result.secure_url;
        }
    }
    const complaint = await prisma.complaint.create({
        data: {
            title,
            description,
            location,
            category,
            imageUrl,
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





export {
    createComplaint,
    updateComplaintStatus,
    acceptComplaint
}
