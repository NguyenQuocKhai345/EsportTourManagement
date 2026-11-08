import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';


export class BadRequestException extends AppException {
  constructor(message = 'Bad Request') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class NotFoundException extends AppException {
  constructor(message = 'Not Found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class ConflictException extends AppException {
  constructor(message = 'Conflict') {
    super(message, HttpStatus.CONFLICT);
  }
}

export class InternalServerErrorException extends AppException {
  constructor(message = 'Internal Server Error') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}