import { db } from "../db/firebase.js";

/**
 * Cancel Event Service - All database operations for cancel requests in Firestore
 */

// Create a cancel request
export const createCancelRequest = async (eventId, reason = null) => {
  try {
    const newCancelRef = db.collection("cancelRequests").doc();

    const cancelRequest = {
      eventId: eventId,
      reason: reason || null,
      status: "underprocess",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await newCancelRef.set(cancelRequest);

    return {
      id: newCancelRef.id,
      _id: newCancelRef.id,
      ...cancelRequest,
    };
  } catch (error) {
    throw new Error(`Failed to create cancel request: ${error.message}`);
  }
};

// Get cancel request by ID
export const getCancelRequestById = async (cancelId) => {
  try {
    const cancelRef = await db.collection("cancelRequests").doc(cancelId).get();

    if (!cancelRef.exists) {
      return null;
    }

    return {
      id: cancelRef.id,
      _id: cancelRef.id,
      ...cancelRef.data(),
    };
  } catch (error) {
    throw new Error(`Failed to get cancel request: ${error.message}`);
  }
};

// Get cancel request by event ID
export const getCancelRequestByEventId = async (eventId) => {
  try {
    const snapshot = await db
      .collection("cancelRequests")
      .where("eventId", "==", eventId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      _id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    throw new Error(`Failed to get cancel request by event ID: ${error.message}`);
  }
};

// Get all cancel requests
export const getAllCancelRequests = async () => {
  try {
    const snapshot = await db
      .collection("cancelRequests")
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      _id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw new Error(`Failed to get cancel requests: ${error.message}`);
  }
};

// Update cancel request status
export const updateCancelRequestStatus = async (cancelId, status) => {
  try {
    const cancelRef = db.collection("cancelRequests").doc(cancelId);

    await cancelRef.update({
      status: status,
      updatedAt: new Date(),
    });

    return await getCancelRequestById(cancelId);
  } catch (error) {
    throw new Error(`Failed to update cancel request: ${error.message}`);
  }
};

// Approve cancel request (marks as approved)
export const approveCancelRequest = async (cancelId) => {
  try {
    return await updateCancelRequestStatus(cancelId, "approved");
  } catch (error) {
    throw new Error(`Failed to approve cancel request: ${error.message}`);
  }
};

// Reject cancel request
export const rejectCancelRequest = async (cancelId) => {
  try {
    return await updateCancelRequestStatus(cancelId, "rejected");
  } catch (error) {
    throw new Error(`Failed to reject cancel request: ${error.message}`);
  }
};

// Delete cancel request
export const deleteCancelRequest = async (cancelId) => {
  try {
    await db.collection("cancelRequests").doc(cancelId).delete();
    return true;
  } catch (error) {
    throw new Error(`Failed to delete cancel request: ${error.message}`);
  }
};

// Get all cancel requests with event and user details (denormalized)
export const getAllCancelRequestsFormatted = async (
  getEventById,
  getUserById
) => {
  try {
    const cancelRequests = await getAllCancelRequests();

    const formatted = await Promise.all(
      cancelRequests.map(async (cancel) => {
        const event = await getEventById(cancel.eventId);
        const user = event ? await getUserById(event.userId) : null;

        return {
          id: cancel.id,
          cancelId: cancel.id,
          reason: cancel.reason,
          progress: cancel.status,
          status: cancel.status,
          createdAt: cancel.createdAt,
          updatedAt: cancel.updatedAt,

          // Event details
          eventId: cancel.eventId,
          ...(event ? event : {}),

          // User details
          userId: user?.id,
          name: user?.username,
          email: user?.email,
          phone: user?.phoneNumber,
          address: user?.address,
        };
      })
    );

    return formatted.filter(Boolean);
  } catch (error) {
    throw new Error(`Failed to get formatted cancel requests: ${error.message}`);
  }
};
