class ApiError extends Error{

    statusCode : number
    data: null | object
    errors?: Error
    constructor(
        statusCode : number,
        message :string = "something went wrong",
        errors?:Error,
        stack : string= ""
    ){
       super(message)
       this.statusCode = statusCode
       this.message = message
       this.data = null
       if(errors){
       this.errors = errors
       }
       if(stack){
        this.stack = stack
       }else{
        Error.captureStackTrace(this,this.constructor)
       }
    }
}

export {ApiError}