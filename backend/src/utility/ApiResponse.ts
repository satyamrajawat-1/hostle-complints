class ApiResponse <T>{
    statusCode : number
    data: T
    message : string
    constructor(statusCode :number,message:string = "success",data:T){
        this.data = data
        this.statusCode = statusCode
        this.message = message
    }
}

export {ApiResponse}