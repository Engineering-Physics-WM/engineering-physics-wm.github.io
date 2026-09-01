import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const readline = createInterface({ input, output });
const password = await readline.question("Instructor password: ");
readline.close();

if (!password) {
  console.error("A password is required.");
  process.exitCode = 1;
} else {
  console.log(await bcrypt.hash(password, 12));
}
