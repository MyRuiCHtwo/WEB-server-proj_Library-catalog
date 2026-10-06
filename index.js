import { program } from "commander";
import { readFile} from "fs/promises";
import { existsSync } from "fs";


async function read_json(filePath) {
    if (!existsSync(filePath)) {
        console.error(`Помилка: Файл "${filePath}" не знайдено.`);
        process.exit(1);
    }
    try {
        const data = await readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Помилка під час читання або парсингу JSON: ${error.message}`);
        process.exit(1);
    }
}


function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const keys = normalizedPath.split('.');
    
    let current = obj;
    for (const key of keys) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[key];
    }
    return current;
}


program
    .name("library-catalog-reader")
    .description("Програма для читання та виведення каталогу бібліотеки та окремих його елементів з JSON файлу.")
    .version("1.0.0");


// Загальні команди для всіх варіантів
program
    .command("read-catalog")
    .description("Показує стислий список основних елементів даних з можливістю обмежити кількість показаних.")
    .option("-f, --file <path>", "Шлях до JSON файлу з каталогом бібліотеки", "data.json")
    .option("-l, --limit <number>", "Обмеження кількості показаних елементів", parseInt)
    .action(async (options) => {
        const catalog = await read_json(options.file);
        let books = catalog.books || [];
        if (options.limit) {
            books = books.slice(0, options.limit);
        }
        console.log("Стислий список елементів каталогу:");
        books.forEach((book, index) => {
            console.log(`${index + 1}. [ID: ${book.book_id}] "${book.book_title}" — ${book.book_author} (${book.book_year})`);
        });
               
    });


program
    .command("read-one-item")
    .description("Показує один елемент даних цілком.")
    .option("-f, --file <path>", "Шлях до JSON файлу з каталогом бібліотеки", "data.json")
    .requiredOption("-i, --id <number>", "ID книги для виведення", parseInt)
    .action(async (options) => {
        const catalog = await read_json(options.file);
        const books = catalog.books || [];
        const item = books.find(b => b.book_id === options.id);
        if (!item) {
            console.error(`Елемент з ID "${options.id}" не знайдено.`);
            process.exit(1);
        }
        console.log(`Деталі елемента з ID "${options.id}":`);
        console.log(JSON.stringify(item, null, 2));
    });


program
    .command("read-one-field")
    .description("Показує одне поле одного елемента даних. Якщо поле порожнє, виводиться повідомлення про це. Якщо значення поле null, виводиться повідомлення про це.")
    .option("-f, --file <path>", "Шлях до JSON файлу з каталогом бібліотеки", "data.json")
    .requiredOption("-i, --id <number>", "ID книги для виведення", parseInt)
    .requiredOption("-k, --key <string>", "Назва поля для виведення")
    .action(async (options) => { 
        const catalog = await read_json(options.file);
        const books = catalog.books || [];
        const item = books.find(b => b.book_id === options.id);
        if (!item) {
            console.error(`Елемент з ID "${options.id}" не знайдено.`);
            process.exit(1);
        }
        const fieldValue = getNestedValue(item, options.key);

        if (fieldValue === undefined) {
            console.error(`Поле "${options.key}" не знайдено у елемента "${options.id}".`);
            process.exit(1);
        }
        if (fieldValue === null) {
            console.log(`Поле "${options.key}" у елемента "${options.id}" має значення null.`);
        } else if (fieldValue === "") {
            console.log(`Поле "${options.key}" у елемента "${options.id}" порожнє.`);
        }
        console.log(`Значення поля "${options.key}" у елемента "${options.id}": ${fieldValue}`);

    });


// Команди конкретно для мого варіанту Каталогу бібліотеки
program
    .command("search-book-by-author")
    .description("Пошук книги за частиною імені автора. Виводить список книг, які відповідають критерію пошуку.")
    .option("-f, --file <path>", "Шлях до JSON файлу з каталогом бібліотеки", "data.json")
    .requiredOption("-a, --author <string>", "Частина імені автора для пошуку")
    .action(async (options) => {
        const catalog = await read_json(options.file);
        const books = catalog.books || [];
        const matchingBooks = books.filter(item => 
            item.book_author && item.book_author.toLowerCase().includes(options.author.toLowerCase())
        );
        if (matchingBooks.length === 0) {
            console.log(`Книги за автором, що містить "${options.author}", не знайдено.`);
        } else {
            console.log(`Знайдено ${matchingBooks.length} книгу(и) за автором, що містить "${options.author}":`);
            matchingBooks.forEach((book, index) => {
                console.log(`${index + 1}. ${book.book_title} (${book.book_author}, ${book.book_year})`);
            });
        }
    });


program
    .command("available-book-examples")
    .description("Показує кількість наявних та незайнятих примірників книги за її назвою.")
    .option("-f, --file <path>", "Шлях до JSON файлу з каталогом бібліотеки", "data.json")
    .requiredOption("-t, --title <string>", "Назва книги для перевірки наявності примірників")
    .action(async (options) => {
        const catalog = await read_json(options.file);
        const books = catalog.books || [];
        const book = books.find(item => 
            item.book_title && item.book_title.toLowerCase() === options.title.toLowerCase()
        );
        if (!book) {
            console.error(`Книга з назвою "${options.title}" не знайдено.`);
            process.exit(1);
        }
        const currentlyIssued = (book.issue_history || []).filter(i => i.return_date === null).length;
        const availableCopies = book.book_copies - currentlyIssued;
        
        console.log(`Книга "${book.book_title}" має ${availableCopies} вільних примірників (всього: ${book.book_copies}, зараз на руках: ${currentlyIssued}).`);
    });
    
    
program 
    .command("book-issue-history")
    .description("Показує історію видачі книги за її назвою.")
    .option("-f, --file <path>", "Шлях до JSON файлу з каталогом бібліотеки", "data.json")
    .requiredOption("-t, --title <string>", "Назва книги для перегляду історії видачі")
    .action(async (options) => {
        const catalog = await read_json(options.file);
        const books = catalog.books || [];
        const book = books.find(item => 
            item.book_title && item.book_title.toLowerCase() === options.title.toLowerCase()
        );

        if (!book) {
            console.error(`Книга з назвою "${options.title}" не знайдено.`);
            process.exit(1);
        }

        if (!book.issue_history || book.issue_history.length === 0) {
            console.log(`Історія видачі книги "${book.book_title}" відсутня.`);
        }
        else {
            console.log(`Історія видачі книги "${book.book_title}":`);
            book.issue_history.forEach((issue, index) => {
                console.log(`${index + 1}. Видано: ${issue.issue_date}, Повернено: ${issue.return_date}, Видано користувачу: ${issue.issued_to}`);
            });
        }
    });
        

program.parse(process.argv);


