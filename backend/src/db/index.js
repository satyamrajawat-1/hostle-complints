import mongoose from "mongoose";

export default async function connect (){
  try {
    const connection = await mongoose.connect(process.env.DB_URL)
    console.log('MongoDB connected !! DB Host: ',connection.connection.host)
  } catch (error) {
    console.log("error in connecting database")
    process.exit(1)
  }
}