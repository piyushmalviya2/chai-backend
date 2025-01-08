import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/apiResponse.js"
import jwt from "jsonwebtokens"

const generateAccessAndRefreshTokens = async(userId) => {    
    try{
        //find user on basis of ID
        const user = await User.findById(userId)
        //generate access and refresh token for the userId
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //save and store refresh token to DB
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        
        // returning access & refresh token outside this method
        return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500, "something went wrong while generating access & refresh token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation -  not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // form data or json data we get through request body
    
    const {fullName, email, username, password} = req.body
    // console.log("email: ", email);
    // console.log("req body: ", req.body);

    if(
        [fullName,email,username, password].some((field)=> field?.trim() ==="")
    ){
        throw new ApiError(400, "All fields are required");    
    }
    
    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }

    //console.log(req.files);
    
    //multer gives us access to ".files"
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    // we dont want to go to next code till upload on cloudinary is done
    // so we are using await, for which we already used async
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    // DB me entry. Only "User" is talking to the database 
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //although the database call is extra but 
    // its a foolproof way to check if the user has been created or not
    //_id is automatically given by mongodb, so we are checking if that exists
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering a user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Created")
    )
    

})

const loginUser = asyncHandler( async (req,res) => {
    // todo for login (wrote by me)
    // 1. take username and pass from model
    // 2. apply specific validations on username & pass input
    // 3. query the db to match username & pass with input 
    // 4. if matches = generate & give access token to user in a cookie
    //  & print success msg
    // 5. else give error msg if username not present||wrong pass
    
    // todo for login (wrote by sir)
    // req body -> data laao
    // take username or email from req body
    // find the user if exists or not
    // if not exists "user not found"
    // if exists -> pass check 
    // if wrong pass -> "wrong pass"
    // else right pass -> access & refresh token generate
    // send tokens to user in cookies
    // success msg


    // take data:
    const {email,username,password} = req.body
    console.log("inside user.controller.js/loginUser fn : email :", email)
    if(!(username || email)){
        throw new ApiError(400,"Username or email required")
    }

    //findOne method of mongoDB available through mongoose
    // returns the first document in mongodb
    const user = await User.findOne({
        // $or is a mongoDB opertor
        $or:[{username}, {email}]
    })

    if(!user){
        throw new ApiError(404,"user doesnt exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"invalid user credentials")
    }


    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                // we already sent access & refresh token in cookies
                // we are sending access & refresh token again in json because 
                // what if user wants to store it in localStorage or 
                // what if he is developing mobile apps (there cookies cant be set)
                user: loggedInUser, accessToken, refreshToken
            },
            "user logged in successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req,res) => {
    // clear cookies
    //User.findById
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new : true
        } 
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    //send req token to backend
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request")
    }
    
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        
        return res
        .status(200)
        .cookies("accessToken", accessToken, options)
        .cookies("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}
