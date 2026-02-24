import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { GoogleGenerativeAI } from '@google/generative-ai';
import mime from 'mime';
import fs from 'fs';
import dotenv from "dotenv";
import * as eventService from "../services/eventService.js";
import * as userService from "../services/userService.js";
import * as cancelEventService from "../services/cancelEventService.js";

dotenv.config();


const registerNewEvent = asyncHandler(async (req, res) => {
    const {
        address,
        userId,
        eventType,
        eventDate,
        eventTime,
        numOFMembers,
        numOfPeopleEating,
        venue,
        totalPrice
    } = req.body;

    // ✅ Validate required fields
    if (
        !userId ||
        !eventType ||
        !eventDate ||
        !eventTime ||
        !numOFMembers ||
        !numOfPeopleEating||
        !venue ||
        !totalPrice
    ) {
        throw new ApiError(409, "One or more required fields are empty");
    }

    // ✅ Check if user exists
    const existUser = await userService.getUserById(userId);
    if (!existUser) {
        throw new ApiError(404, "User does not exist");
    }

    // ✅ Update user address if provided
    if (address) {
        await userService.updateUser(userId, { address });
    }

    // ✅ Check for event conflict (same venue + date + time)
    const hasConflict = await eventService.checkEventConflict(
        venue,
        eventDate,
        eventTime
    );

    if (hasConflict) {
        throw new ApiError(409, "This time slot is already booked at this venue");
    }

    const numPeople = Number(numOfPeopleEating);
    if (isNaN(numPeople) || numPeople <= 0) {
        throw new ApiError(400, "numOfPeopleEating must be a valid positive number");
    }

    const newEvent = await eventService.createEvent({
        user: userId,
        eventType,
        eventDate,
        eventTime,
        numOFMembers,
        numOfPeopleEating: numPeople,
        venue,
        totalPrice,
    });

    return res.status(201).json(
        new ApiResponse(200, newEvent, "New event registered successfully")
    );
});

//Admin
const getOneEventById = asyncHandler(async (req, res) => {
    const { id } = req.body;

    if (!id) {
        throw new ApiError(400, "Event ID is required");
    }

    // Find event by ID + get user details
    const event = await eventService.getEventById(id);

    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    // Get user details
    const user = await userService.getUserById(event.userId);

    const formattedEvent = {
        id: event.id,
        _id: event.id,
        ...event,
        user: user?.id,
        name: user?.username,
        email: user?.email,
        phone: user?.phoneNumber,
        address: user?.address,
    };

    return res.status(200).json(
        new ApiResponse(200, formattedEvent, "Event fetched successfully")
    );
});

const getAllEventsByCategory = asyncHandler(async (req, res) => {
    const { eventType } = req.body;

    if (!eventType) {
        throw new ApiError(400, "Event type is required");
    }

    // Get events with Firestore query
    const events = await eventService.getEventsByCategory(eventType);

    if (!events || events.length === 0) {
        throw new ApiError(404, "No events found for this category");
    }

    // Get user details for each event
    const formattedEvents = await Promise.all(
        events.map(async (event) => {
            const user = await userService.getUserById(event.userId);
            return {
                ...event,
                user: user?.id,
                name: user?.username,
                email: user?.email,
                phone: user?.phoneNumber,
                address: user?.address,
            };
        })
    );

    return res.status(200).json(
        new ApiResponse(200, formattedEvents, "Events fetched successfully")
    );
});




const getEventCounts = asyncHandler(async (req, res) => {
    // Fetch all events
    const countsByCategory = await eventService.getEventCountsByCategory();

    if (!countsByCategory || Object.keys(countsByCategory).length === 0) {
        throw new ApiError(404, "No events found");
    }

    // Send response
    return res.status(200).json(
        new ApiResponse(200, { countsByCategory }, "Event counts fetched successfully")
    );
});
//admin
const deleteEventBy = asyncHandler(async (req, res) => {
    const { id } = req.body;

    if (!id) {
        throw new ApiError(400, "Event ID is required");
    }

    const event = await eventService.getEventById(id);
    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    await eventService.deleteEvent(id);

    return res.status(200).json(
        new ApiResponse(200, null, "Event deleted successfully")
    );
});


//user
const getAllEventsOfUser = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    // Validate required fields
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    // Check if user exists
    const existUser = await userService.getUserById(userId);
    if (!existUser) {
        throw new ApiError(404, "User does not exist");
    }

    // Fetch all events by user
    const userEvents = await eventService.getEventsByUserId(userId);

    // ✅ Instead of throwing error, return empty array
    return res.status(200).json(
        new ApiResponse(
            200,
            userEvents || [],
            "User events fetched successfully"
        )
    );
});


const updateEventDetails = asyncHandler(async (req, res) => {
    const {
        id,              // event id
        userId,
        name,
        email,
        phone,
        address,
        eventType,
        eventDate,
        eventTime,
        numOFMembers,
        numOfPeopleEating,
        venue,
        totalPrice
    } = req.body;

    // ✅ Validate required fields
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }
    if (!id) {
        throw new ApiError(400, "Event ID is required");
    }

    // ✅ Check if user exists
    let existUser = await userService.getUserById(userId);
    if (!existUser) {
        throw new ApiError(404, "User does not exist");
    }

    // ✅ Update user details
    const userUpdateData = {};
    if (name) userUpdateData.username = name;
    if (email) userUpdateData.email = email;
    if (phone) userUpdateData.phoneNumber = phone;
    if (address) userUpdateData.address = address;

    if (Object.keys(userUpdateData).length > 0) {
        await userService.updateUser(userId, userUpdateData);
        existUser = await userService.getUserById(userId);
    }

    // ✅ Check if event exists
    const existEvent = await eventService.getEventById(id);
    if (!existEvent) {
        throw new ApiError(404, "Event does not exist");
    }

    // ✅ Update event details
    const eventUpdateData = {};
    if (eventType) eventUpdateData.eventType = eventType;
    if (eventDate) eventUpdateData.eventDate = eventDate;
    if (eventTime) eventUpdateData.eventTime = eventTime;
    if (numOFMembers) eventUpdateData.numOfMembers = numOFMembers;
    if (numOfPeopleEating) eventUpdateData.numOfPeopleEating = Number(numOfPeopleEating);
    if (venue) eventUpdateData.venue = venue;
    if (totalPrice) eventUpdateData.totalPrice = totalPrice;

    const updatedEvent = await eventService.updateEvent(id, eventUpdateData);

    return res.status(200).json(
        new ApiResponse(200, { user: existUser, event: updatedEvent }, "User & Event updated successfully")
    );
});


const cancelEvent = asyncHandler(async (req, res) => {
  const { eventId, reason } = req.body;

  // Validate required field
  if (!eventId) {
    throw new ApiError(400, "Event ID is required");
  }

  // Check if event exists
  const existEvent = await eventService.getEventById(eventId);
  if (!existEvent) {
    throw new ApiError(404, "Event does not exist");
  }

  // Create cancel request
  const cancelReq = await cancelEventService.createCancelRequest(eventId, reason);

  return res.status(201).json(
    new ApiResponse(201, cancelReq, "Cancel request created successfully")
  );
});

// ✅ Get all cancelled events
const getAllCancelledEventsFormated = asyncHandler(async (req, res) => {
  // Find all cancel requests and populate the event + user
  const cancelledEvents = await cancelEventService.getAllCancelRequests();

  if (!cancelledEvents || cancelledEvents.length === 0) {
    throw new ApiError(404, "No cancelled events found");
  }

  // Flatten structure with user details
  const formatted = await Promise.all(
    cancelledEvents.map(async (cancel) => {
      const event = await eventService.getEventById(cancel.eventId);
      if (!event) return null;

      const user = await userService.getUserById(event.userId);

      return {
        id: cancel.id,
        cancelId: cancel.id,
        reason: cancel.reason,
        progress: cancel.status,
        createdAt: cancel.createdAt,
        updatedAt: cancel.updatedAt,

        // spread event fields
        ...event,

        // keep user id + flattened fields
        user: user?.id,
        name: user?.username,
        email: user?.email,
        phone: user?.phoneNumber,
        address: user?.address,
      };
    })
  );

  return res.status(200).json(
    new ApiResponse(200, formatted.filter(Boolean), "Cancelled events fetched successfully")
  );
});


// Admin: Approve and finalize event cancellation
const approveCancelEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.body;

  // Validate required field
  if (!eventId) {
    throw new ApiError(400, "Event ID is required");
  }

  // Check if cancel request exists
  const cancelReq = await cancelEventService.getCancelRequestByEventId(eventId);
  if (!cancelReq) {
    throw new ApiError(404, "Cancel request not found for this event");
  }

  // Check if event exists
  const existEvent = await eventService.getEventById(eventId);
  if (!existEvent) {
    throw new ApiError(404, "Event does not exist");
  }

  // Delete the event
  await eventService.deleteEvent(eventId);

  // Delete cancel request as well
  await cancelEventService.deleteCancelRequest(cancelReq.id);

  return res.status(200).json(
    new ApiResponse(200, null, "Event and cancel request deleted successfully")
  );
});

// Get all cancel events
const getAllCancelEvents = asyncHandler(async (req, res) => {
  const cancelEvents = await cancelEventService.getAllCancelRequests();

  if (!cancelEvents || cancelEvents.length === 0) {
    throw new ApiError(404, "No cancel events found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, cancelEvents, "Cancel events fetched successfully"));
});

export{
    registerNewEvent,
    getAllEventsByCategory,
    getAllEventsOfUser,
    updateEventDetails,
    getEventCounts,
    deleteEventBy,
    getOneEventById,
    cancelEvent,
    approveCancelEvent,
    getAllCancelEvents,
    getAllCancelledEventsFormated
}