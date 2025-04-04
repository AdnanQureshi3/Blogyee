const { Schema, model } = require('mongoose');
const { createHmac, randomBytes } = require('crypto');
const { createToken } = require("../services/authentication");

const userSchema = new Schema({
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    salt: { type: String },
    password: { type: String, required: true },
    views:{type:Number,  default: 0},
    totalLikes:{type:Number , default: 0},
    profilePhoto: { type: String, default: '/assets/images/default_image.png' },
    bio:{ type: String, default: ""}
    
}, { timestamps: true });

userSchema.pre("save", function (next){
    
    if (!this.isModified("password")) return next();
    const salt = randomBytes(16).toString("hex");
    this.salt = salt;
    this.password = createHmac("sha256", salt).update(this.password).digest("hex");
    next();

});

userSchema.static("matchPassword", async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error('User not Found');

    const userProvidedHash = createHmac("sha256", user.salt).update(password).digest("hex");
    if (user.password !== userProvidedHash) throw new Error('Incorrect Password');

    return await createToken(user);
});

module.exports = model('user', userSchema);
