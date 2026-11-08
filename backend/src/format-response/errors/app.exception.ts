import { HttpStatus } from "@nestjs/common";

export class AppException extends Error {
  public success = false;

  constructor(
    public message: string,
    public statusCode: number = HttpStatus.BAD_REQUEST,
  ) {
    super(message);
  }
}