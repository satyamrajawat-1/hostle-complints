import mongoose from "mongoose";

const userschema = new mongoose.Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            trim:true,
            index:true

        }
    },
    {
      timeseries:true,
      timestamps:true  
    })

    export const User = mongoose.model("User",userschema)