import asyncHandler from "../utility/AsyncHandler.js"
import jwt from "jsonwebtoken"
import { ApiError } from "../utility/ApiError.js"
import { User } from "../models/User.model.js"

export const verifyjwt = asyncHandler(async(req,res,next)=>{
    try {
        const incomingTOken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token){
            throw new ApiError(401,"Unauthorized Access")
        }
        const decodedToken =jwt.verify(token.toString(),process.env.ACCESS_TOKEN_SECRET)
        if(!decodedToken){
            throw new ApiError(400,"Invalid or Expired Token")
        }

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user){
            throw new ApiError(400,"Invalid Token")
        }

        req.user = user
        next()

    } catch (error) {
        throw new ApiError(404 , error?.message || "Invalid Access Token")
    }
})