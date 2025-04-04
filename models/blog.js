const { Schema, model } = require('mongoose');

const blogSchema = new Schema({
    title:{
        type:String,
        require:true,
    },
    body:{
        type:String,
        require:true,
    },
    coverImageURL:{
        type:String,
    },
    createdBy:{
        type:Schema.Types.ObjectId,
        ref:'user'
    },
    likes: [{ type: Schema.Types.ObjectId, ref: 'user' }],
    views: { 
        type: Number, 
        default: 0 
    }

}, {timestamps:true});


const Blog = model('blog' , blogSchema);
module.exports = Blog;
