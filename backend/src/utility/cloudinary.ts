import {v2 as cloudinary, type UploadApiResponse} from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!
});

const uploadOnCloudinary = async(localPath:string | null) : Promise<UploadApiResponse | null >=>{
    if(!localPath){
        return null;
    }

    try {
        const response = await cloudinary.uploader.upload(localPath,{
            resource_type:"auto",
            folder:"hrms",
            unique_filename:true
        })
        console.log("file is uploaded successfully")
        fs.unlinkSync(localPath)
        return response
    } catch (error) {
        console.log("error in uploading file on cloudinary " , error)
        fs.unlinkSync(localPath)
        return null
    }
}

export {uploadOnCloudinary}