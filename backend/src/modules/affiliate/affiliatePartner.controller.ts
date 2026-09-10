import type { Request, Response } from "express";
import { ApiError } from "../../lib/apiError";
import { PartnerUser } from "./partnerUser.model";

// Partner/affiliate registration CRUD (local mirror used by the partner dashboard).

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const userData = req.body as Record<string, unknown>;
  const roleType = userData.roleType;

  // Referral code is optional for Partner and Promoter Partner.
  if (roleType !== "AFFILIATE") {
    delete userData.refferalCode;
  }

  try {
    const newUser = new PartnerUser(userData);
    await newUser.save();
    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      throw new ApiError(409, "A user with this Mobile or userId already exists.");
    }
    throw error;
  }
};

// Update an existing user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  // Legacy parity: the route declares ":id" but the controller always read
  // "userId" from req.params — preserved verbatim so lookup behaviour (and the
  // dashboard's expectations) stay identical.
  const { userId } = req.params;
  const updateData = req.body as Record<string, unknown>;
  const { roleType, refferalCode } = updateData as { roleType?: string; refferalCode?: string };

  if (roleType === "AFFILIATE" && (!refferalCode || refferalCode.trim() === "")) {
    throw ApiError.badRequest("Validation failed: Referral code is required for affiliates.");
  }

  // Handle $unset for roles that don't need a referral code
  if (roleType !== "AFFILIATE") {
    updateData.$unset = { refferalCode: 1 };
    delete updateData.refferalCode;
  }

  const updatedUser = await PartnerUser.findOneAndUpdate({ userId }, updateData, { new: true });

  if (!updatedUser) {
    throw ApiError.notFound("User not found");
  }

  res.status(200).json({ message: "User updated successfully", user: updatedUser });
};

// Get all users
export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await PartnerUser.find().lean();
  res.json(users);
};

// Get single user by Mongo ID
export const getUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await PartnerUser.findById(id).lean();
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    res.json(user);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Legacy parity: lookup failures (e.g. malformed ids) answer 400.
    throw ApiError.badRequest(error instanceof Error ? error.message : String(error));
  }
};

// Delete user by Mongo ID
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await PartnerUser.findByIdAndDelete(id).lean();
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Legacy parity: delete failures (e.g. malformed ids) answer 400.
    throw ApiError.badRequest(error instanceof Error ? error.message : String(error));
  }
};
