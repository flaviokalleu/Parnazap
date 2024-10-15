import { WAMessage, AnyMessageContent } from "@whiskeysockets/baileys";
import * as Sentry from "@sentry/node";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";
import mime from "mime-types";
import formatBody from "../../helpers/Mustache";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

// Função para processar áudio para MP3 com volume ajustado
const processAudioMp3 = async (audio: string): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
  return new Promise((resolve, reject) => {
    exec(
      `"${ffmpegPath.path}" -i "${audio}" -vn -c:a libmp3lame -b:a 128k -ar 44100 -ac 1 -filter:a "volume=0.9" "${outputAudio}" -y`,
      (error, _stdout, stderr) => {
        if (error) {
          console.error("Erro no processamento de áudio (MP3):", error);
          console.error("FFmpeg stderr:", stderr);
          reject(error);
        } else {
          fs.unlinkSync(audio);
          resolve(outputAudio);
        }
      }
    );
  });
};

export const getMessageOptions = async (
  fileName: string,
  pathMedia: string,
  body?: string
): Promise<any> => {
  const mimeType = mime.lookup(pathMedia);
  if (!mimeType) {
    throw new Error("Invalid mimetype");
  }
  const typeMessage = mimeType.split("/")[0];
  let options: AnyMessageContent;

  try {
    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: body || '',
        fileName: fileName
      };
    } else if (typeMessage === "audio") {
      const isPTT = fileName.includes("audio-record-site");
      let convert: string;
      let mimetype: string;
      let ptt: boolean;

      // Processamento único para MP3
      convert = await processAudioMp3(pathMedia);
      mimetype = "audio/mpeg";
      ptt = isPTT;

      options = {
        audio: fs.readFileSync(convert),
        mimetype: mimetype,
        caption: body || null,
        ptt: ptt
      };
    } else if (typeMessage === "document" || typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body || null,
        fileName: fileName,
        mimetype: mimeType
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: body || null
      };
    }

    return options;
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return null;
  }
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<WAMessage> => {
  try {
    const wbot = await GetTicketWbot(ticket);
    const pathMedia = media.path;
    const typeMessage = media.mimetype.split("/")[0];
    let options: AnyMessageContent;
    const bodyMessage = formatBody(body, ticket.contact);

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname
      };
    } else if (typeMessage === "audio") {
      const isPTT = media.originalname.includes("audio-record-site");
      let convert: string;
      let mimetype: string;
      let ptt: boolean;

      // Processamento único para MP3
      convert = await processAudioMp3(media.path);
      mimetype = "audio/mpeg";
      ptt = isPTT;

      options = {
        audio: fs.readFileSync(convert),
        mimetype: mimetype,
        ptt: ptt,
        caption: bodyMessage || null
      };
    } else if (typeMessage === "document" || typeMessage === "text") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname,
        mimetype: media.mimetype
      };
    } else if (typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname,
        mimetype: media.mimetype
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: bodyMessage,
      };
    }

    const sentMessage = await wbot.sendMessage(
      `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      {
        ...options
      }
    );

    await ticket.update({ lastMessage: bodyMessage });

    return sentMessage;
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
