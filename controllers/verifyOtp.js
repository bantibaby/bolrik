const otpVerify = async (otpTime) =>{

    try {
        console.log(`millisecond is :` + otpTime);
        const cDateTime = new Date();
        var timeDiff = (otpTime - cDateTime.getTime()) / 1000;
        var timeDiff = timeDiff/60;
        const minutes = Math.abs(timeDiff);

        console.log("Your Otp expire with in " + minutes);

        if(minutes > 5){
            return true;
        }
        return false;

    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {otpVerify};