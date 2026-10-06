import { program } from "commander";
import { read_file} from "fs/promises";
import {existsSync} from "fs";


async function read_json(filePath) {
    if (!existsSync(filePath)) {
        console.error(`Помилка: Файл "${filePath}" не знайдено.`);
        process.exit(1);
    }
    try {
        const data = await read_file(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Помилка під час читання або парсингу JSON: ${error.message}`);
        process.exit(1);
    }
}




