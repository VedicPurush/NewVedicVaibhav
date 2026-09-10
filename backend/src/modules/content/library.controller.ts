import type { Request, Response } from "express";
import { Library } from "./library.model";
import { DailyQuote } from "./quotes.model";

export const getLibraries = async (_req: Request, res: Response): Promise<void> => {
  const libraries = await Library.find({});
  res.status(200).json(libraries);
};

export const getLibraryById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const library = await Library.findById(req.params.id);
  if (!library) {
    res.status(404).json({ message: "Library item not found" });
    return;
  }
  res.status(200).json({ library });
};

/** All daily quotes sorted by date ascending. */
export const getDailyQuotes = async (_req: Request, res: Response): Promise<void> => {
  const quotes = await DailyQuote.find({}).sort({ date: 1 });
  res.status(200).json(quotes);
};
