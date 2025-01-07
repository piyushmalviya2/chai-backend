import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/apiResponse.js"

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

export {registerUser}
