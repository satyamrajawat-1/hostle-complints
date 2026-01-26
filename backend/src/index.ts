import dotenv from 'dotenv'
import { app } from './app.js'
dotenv.config()


app.listen(`${process.env.PORT}`, () => {
    console.log(`App is listening on port : ${process.env.PORT}`)
});
app.get('/',(req,res)=>{
    res.send("Welcome to Complaints Management System Backend")
});
