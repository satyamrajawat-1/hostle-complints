import dotenv from 'dotenv'
import {app} from './app.js'
import connect from './db/index.js'
dotenv.config()

connect().then(()=>{
    app.on('error',(error)=>{
        console.log('Error in connecting app :',error)
    })
    app.listen(`${process.env.PORT}`,()=>{
        console.log(`App is listening on port : ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log(`Error in connecting database :`,error)
})