import type { Request, Response } from "express";
import { ApiError } from "../../lib/apiError";
import BBPackage from "./bbPackage.model";

// Get all packages
export const getAllBBPackages = async (_req: Request, res: Response): Promise<void> => {
  const packages = await BBPackage.find().sort({ numberOfDays: 1 }).lean();
  res.json(packages);
};

// Get single package by ID
export const getBBPackageById = async (req: Request, res: Response): Promise<void> => {
  const bbPackage = await BBPackage.findById(req.params.id).lean();
  if (!bbPackage) {
    throw ApiError.notFound("Package not found");
  }
  res.json(bbPackage);
};

// Create new package
export const createBBPackage = async (req: Request, res: Response): Promise<void> => {
  const { packageName, packagePrice, numberOfDays, description } = req.body as Record<string, unknown>;
  try {
    const newPackage = new BBPackage({ packageName, packagePrice, numberOfDays, description });
    const savedPackage = await newPackage.save();
    res.status(201).json(savedPackage);
  } catch (error) {
    // Legacy parity: creation failures (e.g. validation) answer 400.
    throw ApiError.badRequest("Error creating package", error);
  }
};

// Update package
export const updateBBPackage = async (req: Request, res: Response): Promise<void> => {
  const { packageName, packagePrice, numberOfDays, description } = req.body as {
    packageName: string;
    packagePrice: number;
    numberOfDays: number;
    description: string;
  };
  try {
    const bbPackage = await BBPackage.findById(req.params.id);
    if (!bbPackage) {
      throw ApiError.notFound("Package not found");
    }
    bbPackage.packageName = packageName;
    bbPackage.packagePrice = packagePrice;
    bbPackage.numberOfDays = numberOfDays;
    bbPackage.description = description;
    const savedPackage = await bbPackage.save();
    res.json(savedPackage);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Legacy parity: update failures (bad id, validation) answer 400.
    throw ApiError.badRequest("Error updating package", error);
  }
};

// Delete package
export const deleteBBPackage = async (req: Request, res: Response): Promise<void> => {
  const bbPackage = await BBPackage.findByIdAndDelete(req.params.id).lean();
  if (!bbPackage) {
    throw ApiError.notFound("Package not found");
  }
  res.json({ message: "Package deleted successfully" });
};
