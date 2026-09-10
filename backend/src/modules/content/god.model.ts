import { Schema } from "mongoose";
import { dbMain } from "../../config/db";

interface IChalisa {
  name: string;
  text: string;
}

interface IMantra {
  mantraName: string;
  mantra: string;
  explanation: string;
  recording: string; // URL for audio file
}

interface IAarti {
  name: string;
  text: string;
}

interface IAshtakam {
  name: string;
  text: string;
}

interface IMusic {
  title: string;
  fileUrl: string; // URL for audio file
}

export interface IGod {
  godName: string;
  godImage: string; // URL for god image
  chalisa: IChalisa[];
  mantra: IMantra[];
  aarti: IAarti[];
  ashtakam: IAshtakam[];
  music: IMusic[];
}

const chalisaSchema = new Schema<IChalisa>({
  name: { type: String, required: true },
  text: { type: String, required: true },
});

const mantraSchema = new Schema<IMantra>({
  mantraName: { type: String, required: true },
  mantra: { type: String, required: true },
  explanation: { type: String, required: true },
  recording: { type: String, required: true },
});

const aartiSchema = new Schema<IAarti>({
  name: { type: String, required: true },
  text: { type: String, required: true },
});

const ashtakamSchema = new Schema<IAshtakam>({
  name: { type: String, required: true },
  text: { type: String, required: true },
});

const musicSchema = new Schema<IMusic>({
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
});

const godSchema = new Schema<IGod>(
  {
    godName: { type: String, required: true },
    godImage: { type: String, required: true },
    chalisa: [chalisaSchema],
    mantra: [mantraSchema],
    aarti: [aartiSchema],
    ashtakam: [ashtakamSchema],
    music: [musicSchema],
  },
  { timestamps: true },
);

export const God = dbMain.model<IGod>("God", godSchema, "gods");
