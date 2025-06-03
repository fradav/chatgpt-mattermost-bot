// src/plugins/ThinkPlugin.ts
import { PluginBase } from "./PluginBase";
import { AiResponse, MessageData } from "../types";
import { botLog } from "../logging";
// Import required dependencies if not imported
import FormData from "form-data";
import { mmClient } from "../mm-client";

type ThinkArgs = {
    message: string;
};

export class ThinkPlugin extends PluginBase<ThinkArgs> {
    constructor() {
        super("think-plugin", "Extracts the thinking part of a response and attaches it as a text file.");
    }

    setup(): boolean {
        this.addPluginArgument("message", "string", "The message containing the thinking part.");

        const plugins = process.env["PLUGINS"];
        if (!plugins || plugins.indexOf('think-plugin') === -1)
            return false
        return true;
    }

    async runPlugin(args: ThinkArgs, msgData: MessageData): Promise<AiResponse> {
        const content = args.message
        const result: AiResponse = {
            message: content
        }
        botLog.debug("ThinkPlugin:runPlugin() with args : ", content);
        const replaceStart = content.match(/<think>/i)?.index
        botLog.debug("replaceStart is ", replaceStart)
        let replaceEnd = content.match(/<\/think>/i)?.index
        if (replaceEnd) {
            replaceEnd += '</think>'.length
        }
        botLog.debug("relpaceEnd is", replaceEnd)
        if ((replaceStart != undefined) && replaceEnd) {
            const thinkContent = content.substring(replaceStart, replaceEnd).replace(/<\/?think>/gi, '').trim()
            botLog.debug("thinkContent is ", thinkContent)
            try {
                const fileId = await this.saveThinkContentAsFile(thinkContent, msgData.post.channel_id);
                const pre = content.substring(0, replaceStart)
                const post = content.substring(replaceEnd)

                if (post.trim().length < 1) {
                    result.message = pre
                } else {
                    result.message = `${pre}[see attached chain of thought]\n${post}`
                }


                result.fileId = fileId
            } catch (e) {
                this.log.error(e)
                this.log.error(`The input was:\n\n${thinkContent}`)
            }
        }
        return result
    }

    private async saveThinkContentAsFile(content: string, channelId: string): Promise<string> {
        const fileName = `think_${Date.now()}.md`;
        const form = new FormData();

        // Use Buffer to generate binary data for the file content
        const fileBuffer = Buffer.from(content, 'utf-8');

        // Append the channel ID and file content to the form
        form.append('channel_id', channelId);
        form.append('files', fileBuffer, fileName);

        // Use mmClient to upload the file
        const response = await mmClient.uploadFile(form);
        this.log.trace('Uploaded a file with id', response.file_infos[0].id);

        return response.file_infos[0].id;
    }

}