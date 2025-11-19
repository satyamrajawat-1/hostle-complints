import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import errorHandler from './middlewares/errorHandler.js'
const app = express()

app.use(cookieParser())
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({
    limit:"16kb"
}))


app.use(express.urlencoded({
    limit:"16kb",
}))



app.use(express.static("public"))


app.use(errorHandler)
export {app}


