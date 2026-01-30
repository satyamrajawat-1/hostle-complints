import { v2 as cloudinary } from 'cloudinary';
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
        return result.result === 'ok' || result.result === 'not found';
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        return false;
    }
};