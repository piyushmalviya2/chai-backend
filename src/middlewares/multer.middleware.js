import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req,file,cb){
        cb(null, './public/temp')
    },
    filename: function(req, file, cb){
        cb(null, file.originalname)
        // if filename is same then they will be overwritten,
        // but this operation will be for very tiny amount of time on server 
        // as the file will be uploaded to cloudinary and will be deleted from local server        
    },

})


export const upload = multer({ storage, })