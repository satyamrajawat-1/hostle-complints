import { asyncHandler } from "../utility/AsyncHandler.js";
import { ApiError } from "../utility/ApiError.js";
import { ApiResponse } from "../utility/ApiResponse.js";
import { prisma } from "../lib/prisma.js";


const giveFeedback = asyncHandler(async (req, res) => {
    const { complaintId, rating, comment } = req.body;
    if (!complaintId || !rating) {
        throw new ApiError(400, "Complaint ID and rating are required");
    }
    if (comment && comment.length > 500) {
        throw new ApiError(400, "Comment too long");
    }

    const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
    });
    if (!complaint) {
        throw new ApiError(404, "Complaint not found");
    }
    const userId = req.user?.id;
    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }
    if (complaint.studentId !== userId) {
        throw new ApiError(403, "You can only give feedback on your own complaint");
    }
    if (complaint.status !== "RESOLVED") {
        throw new ApiError(400, "Feedback allowed only after complaint is resolved");
    }
    const existingFeedback = await prisma.feedback.findUnique({
        where: { complaintId }
    });

    if (existingFeedback) {
        throw new ApiError(409, "Feedback already submitted for this complaint");
    }

    const feedback = await prisma.feedback.create({
        data: {
            complaintId,
            rating,
            comment,
            studentId: userId,

        },
    });
    if (!feedback) {
        throw new ApiError(500, "Error creating feedback");
    }
    return res
        .status(201)
        .json(
            new ApiResponse(201, "Feedback created successfully", {
                feedback,
            })
        );
});

export { giveFeedback };