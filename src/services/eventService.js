import { db } from "../db/firebase.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Event Service - All database operations for events in Firestore
 */

// Create a new event
export const createEvent = async (eventData) => {
  try {
    const newEventRef = db.collection("events").doc();

    const event = {
      userId: eventData.user || eventData.userId,
      eventType: eventData.eventType,
      eventDate: new Date(eventData.eventDate),
      eventTime: eventData.eventTime,
      numOfMembers: eventData.numOFMembers || eventData.numOfMembers,
      numOfPeopleEating: parseInt(eventData.numOfPeopleEating),
      venue: eventData.venue,
      totalPrice: eventData.totalPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await newEventRef.set(event);

    return {
      id: newEventRef.id,
      _id: newEventRef.id, // For backward compatibility with MongoDB
      ...event,
    };
  } catch (error) {
    throw new Error(`Failed to create event: ${error.message}`);
  }
};

// Get event by ID
export const getEventById = async (eventId) => {
  try {
    const eventRef = await db.collection("events").doc(eventId).get();

    if (!eventRef.exists) {
      return null;
    }

    return {
      id: eventRef.id,
      _id: eventRef.id, // For backward compatibility
      ...eventRef.data(),
    };
  } catch (error) {
    throw new Error(`Failed to get event: ${error.message}`);
  }
};

// Get all events by user
export const getEventsByUserId = async (userId) => {
  try {
    const snapshot = await db
      .collection("events")
      .where("userId", "==", userId)
      .orderBy("eventDate", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      _id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw new Error(`Failed to get user events: ${error.message}`);
  }
};

// Get all events by category
export const getEventsByCategory = async (eventType) => {
  try {
    let query = db.collection("events");

    if (eventType && eventType !== "All Events") {
      query = query.where("eventType", "==", eventType);
    }

    const snapshot = await query.orderBy("eventDate", "desc").get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      _id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw new Error(`Failed to get events by category: ${error.message}`);
  }
};

// Get all events
export const getAllEvents = async () => {
  try {
    const snapshot = await db
      .collection("events")
      .orderBy("eventDate", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      _id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw new Error(`Failed to get all events: ${error.message}`);
  }
};

// Update event
export const updateEvent = async (eventId, updateData) => {
  try {
    const eventRef = db.collection("events").doc(eventId);

    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date(),
    };

    // Handle date conversion if eventDate is provided
    if (updateData.eventDate) {
      dataToUpdate.eventDate = new Date(updateData.eventDate);
    }

    // Handle number conversion for numOfPeopleEating
    if (updateData.numOfPeopleEating) {
      dataToUpdate.numOfPeopleEating = parseInt(updateData.numOfPeopleEating);
    }

    await eventRef.update(dataToUpdate);

    return await getEventById(eventId);
  } catch (error) {
    throw new Error(`Failed to update event: ${error.message}`);
  }
};

// Delete event
export const deleteEvent = async (eventId) => {
  try {
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await db.collection("events").doc(eventId).delete();

    // Also delete associated cancel requests
    const cancelRequests = await db
      .collection("cancelRequests")
      .where("eventId", "==", eventId)
      .get();

    cancelRequests.docs.forEach(async (doc) => {
      await doc.ref.delete();
    });

    return true;
  } catch (error) {
    throw new Error(`Failed to delete event: ${error.message}`);
  }
};

// Check for event conflict (same venue, date, time)
export const checkEventConflict = async (venue, eventDate, eventTime) => {
  try {
    const snapshot = await db
      .collection("events")
      .where("venue", "==", venue)
      .where("eventDate", "==", new Date(eventDate))
      .where("eventTime", "==", eventTime)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    throw new Error(`Failed to check event conflict: ${error.message}`);
  }
};

// Get event counts by category
export const getEventCountsByCategory = async () => {
  try {
    const allEvents = await getAllEvents();

    const countsByCategory = {};
    let totalEvents = allEvents.length;

    allEvents.forEach((event) => {
      const category = event.eventType || "Uncategorized";
      countsByCategory[category] = (countsByCategory[category] || 0) + 1;
    });

    countsByCategory["All Events"] = totalEvents;

    return countsByCategory;
  } catch (error) {
    throw new Error(`Failed to get event counts: ${error.message}`);
  }
};

// Get event with user details (denormalized)
export const getEventWithUser = async (eventId, getUserById) => {
  try {
    const event = await getEventById(eventId);
    if (!event) return null;

    const user = await getUserById(event.userId);

    return {
      ...event,
      user: user?.id,
      name: user?.username,
      email: user?.email,
      phone: user?.phoneNumber,
      address: user?.address,
    };
  } catch (error) {
    throw new Error(`Failed to get event with user: ${error.message}`);
  }
};
