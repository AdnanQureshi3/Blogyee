const { validateToken } = require("../services/authentication");

function checkForAuthCookie(cookieName){
    return (req , res , next) =>{
        const tokenValue = req.cookies[cookieName];

        if(!tokenValue) return next();

        try{
            const userPayload = validateToken(tokenValue);
            req.user = userPayload;
           return next();
        }
        catch(error) {

        }
       return  next();

    };
}

module.exports = {
    checkForAuthCookie,
}