//require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

connectDB()
.then(()=>{

    //check if express app has any error and print error
    app.on('error', (error)=>{
        console.log(`Express Error: ${error}`);
        throw error
    })

    //if everything goes right, express should listen on port
    app.listen(process.env.PORT || 8000), ()=>{
        console.log(`🐕‍🦺 Server is running at PORT: ${process.env.PORT}`);
    }
})
.catch((error) => {
    console.log("MongoDB connection failed: ", error);
})
















/*
import express from "express"
const app = express()

;( async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    // if db is connected but express app has error then following code:
        app.on("error", (error) => {
            console.log("ERROR: ", error);
            throw error
        })
        app.listen(process.env.PORT, () => {
            console.log(`App is listening on PORT ${process.env.PORT}`);
            
        })
    } catch (error){
        console.error("ERROR: ",error);
        throw error
    }
})()
    */