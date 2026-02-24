import PDFDocument from 'pdfkit';
import fs from "fs";
import * as userService from '../services/userService.js';
import { ApiError } from './ApiError.js';

const pdf = async (_id) => {
    const doc = new PDFDocument;

    // Find the user by ID
    const user = await userService.getUserById(_id);

    // Check if user exists
    if (!user) {
        throw new ApiError(500,`User with ID ${_id} not found`);
    }

    // Create the PDF document
    const path = `./public/temp/user_${_id}.pdf`;
    const writeStream = fs.createWriteStream(path);
    doc.pipe(writeStream);

    // Write content to the PDF document
    
    doc.text(`Hello ${user.username}`);
    doc.text(`Email: ${user.email}`);

    // End the PDF document
    doc.end();

    return path;
}

export { pdf };
