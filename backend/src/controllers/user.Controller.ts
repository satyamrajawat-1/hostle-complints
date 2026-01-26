import { prisma } from "../lib/prisma.js"
import bcrypt from "bcryptjs"
import { asyncHandler } from "../utility/AsyncHandler.js"
import { ApiError } from "../utility/ApiError.js"
import { ApiResponse } from "../utility/ApiResponse.js"
import { generateAccessToken, generateRefreshToken } from "../utility/generateTokens.js"
import jwt from "jsonwebtoken"
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role, category } = req.body
    if ([name, email, password, role].some(f => !f)) {
        throw new ApiError(400, "All fields are required")
    }
    const validRoles = ["STUDENT", "STAFF", "WORKER", "WARDEN"]
    if (!validRoles.includes(role)) {
        throw new ApiError(400, "Invalid role")
    }

    if (role === "WORKER" && !category) {
        throw new ApiError(400, "Category is required for WORKER role")
    }
    const existingUser = await prisma.user.findUnique({
        where: { email }
    })
    if (existingUser) {
        throw new ApiError(409, "User with this email already exists")
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashPassword,
            role,
            category: role === "WORKER" ? category : null
        }
    })
    if (!user) {
        throw new ApiError(500, "Error creating user")
    }
    return res
        .status(201)
        .json(
            new ApiResponse(201, "User created successfully", {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            })
        )
})

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        throw new ApiError(400, "Email and password are required")
    }
    const user = await prisma.user.findUnique({
        where: { email }
    })
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password")
    }
    const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role
    })
    const refreshToken = generateRefreshToken(user.id)
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken}
    })
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: "none" as const
    }
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, "Login successful", {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            })
        )

})

const logout = asyncHandler(async (req, res) => {
    const userId = req.user?.id
    if (!userId) {
        throw new ApiError(401, "Unauthorized Access")
    }
    await prisma.user.updateMany({
        where: { id: userId, refreshToken: { not: null } },
        data: { refreshToken: null}
    })
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    })
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    })
    return res
        .status(200)
        .json(new ApiResponse(200, "Logout successful", null))
})

const changePassword = asyncHandler(async (req, res) => {
    const userId = req.user?.id
    const { oldPassword, newPassword } = req.body
    if (!userId) {
        throw new ApiError(401, "Unauthorized Access")
    }
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required")
    }
    const user = await prisma.user.findUnique({
        where: { id: userId }
    })
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password)
    if (!isOldPasswordValid) {
        throw new ApiError(401, "Old password is incorrect")
    }
    const hashNewPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashNewPassword , refreshToken: null}
    })
    return res
        .status(200)
        .json(new ApiResponse(200, "Password changed successfully", null))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!refreshToken) {
        throw new ApiError(401, "Unauthorized Access")
    }
    try {
        const decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string)
        const userId = (decodedToken as jwt.JwtPayload).userId
        const user = await prisma.user.findUnique({
            where: { id: userId }
        })
        if (!user) {
            throw new ApiError(404, "User not found")
        }
        if (user.refreshToken !== refreshToken) {
            throw new ApiError(401, "Invalid refresh token")
        }
        const newAccessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            role: user.role
        })
        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: "none" as const
        }
        return res
            .status(200)
            .cookie("accessToken", newAccessToken, cookieOptions)
            .json(
                new ApiResponse(200, "Access token refreshed successfully", {
                    accessToken: newAccessToken
                })
            )
    } catch (error) {
        if (error instanceof Error) {
            throw new ApiError(401, "Invalid refresh token", error)
        }
        throw new ApiError(401, "Invalid refresh token")
    }
})









export {
    registerUser,
    login,
    logout,
    changePassword,
    refreshAccessToken
}