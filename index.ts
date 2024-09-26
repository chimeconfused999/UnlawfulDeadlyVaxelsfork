import express from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import OpenAI from "openai";
import * as readline from "readline";
import path from "path";

const port = "3000";
const app = express();
const mySecret = process.env["OPENAI_API_KEY"];
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataFilePath = path.join(__dirname, "data.json");
const jsonData = readJSONFile(dataFilePath);
var additionalcomments = "";

if (jsonData.length == 0) {

  console.log("data.json is empty or invalid, generating initial data");

  //chatgpt will generate code for a game.

  //API key is not there
  if (process.env.OPENAI_API_KEY === "") {
    console.error(`You haven't set up your API key yet. Open the Secrets Tool and add OPENAI_API_KEY as a secret.`);
    process.exit(1);
  }

  const openai = new OpenAI({
    apiKey: mySecret,
  });

  const GPT4Message = [
    {
      role: "system",
      content:
        "Answer with something that consistently works on all examples that you have seen. All CSS code in style.css. Make sure to always add HTML CSS and Javascript code as long as there are parts required in the code. Don't include an explanation or title. Just answer the question. Do not include other things that aren't part of the code. All Code should strictly go in the order of HTML, then CSS, then  Javascript. For each PART of the code, end and start with ```, for example ```<!DOCTYPE html></html>```. Use ```css for the css and ```javascript for the javascript. Additionally, for the html section, only include the code between the <body></body> not including those two themselves",
    },
    {
      role: "user",
      content: "Can you design a basic website for a non profit? Add elements for a schedule, calendar, AI chatbot, and more.",
      //"Can you make a HTML, CSS, and Javascript code for a game that uses WASD to move? "
    },
  ];

  let GPT4 = async (message) => {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: message,
    });

    return response.choices[0].message.content;
  };


  const allcode = (await GPT4(GPT4Message)) || "";

  //splits into html section, css section, and javascript section
  const htmlMarker = "```html";
  const htmlStartIndex = allcode.indexOf(htmlMarker);
  let html = "";
  if (htmlStartIndex !== -1) {
    const htmlEndIndex = allcode.indexOf(
      "```",
      htmlStartIndex + htmlMarker.length,
    );
    if (htmlEndIndex !== -1) {
      html = allcode
        .substring(htmlStartIndex + htmlMarker.length, htmlEndIndex)
        .trim();
    }
  }

  // Extract CSS
  const cssMarker = "```css";
  const cssStartIndex = allcode.indexOf(cssMarker);
  let css = "";
  if (cssStartIndex !== -1) {
    const cssEndIndex = allcode.indexOf(
      "```",
      cssStartIndex + cssMarker.length,
    );
    if (cssEndIndex !== -1) {
      css = allcode
        .substring(cssStartIndex + cssMarker.length, cssEndIndex)
        .trim();
    }
  }

  // Extract JavaScript
  const jsMarker = "```javascript";
  const jsStartIndex = allcode.indexOf(jsMarker);
  let js = "";
  if (jsStartIndex !== -1) {
    const jsEndIndex = allcode.indexOf("```", jsStartIndex + jsMarker.length);
    if (jsEndIndex !== -1) {
      js = allcode.substring(jsStartIndex + jsMarker.length, jsEndIndex).trim();
    }
  }
  console.log(allcode);
  console.log("\n");
  console.log(html);
  console.log("\nENDOFHTML\n");
  console.log(css);
  console.log("\nENDOFCSS\n");
  console.log(js);
  console.log("\nENDOFJS\n");
  const allData = {
    html: html,
    css: css,
    javascript: js,
  };

  // Add the new data
  addData(allData,"data.json");
} else {
  console.log("Data.json is not empty, skipping initial data generation");
}

//iframe stuff
app.get("/", (req, res) => {
  const dataFilePath = path.join(__dirname, "data.json");
  const errorFilePath = path.join(__dirname, "errors.json");

  // Reading JSON data from file
  const jsonData = readJSONFile(dataFilePath);

  if (jsonData.length > 0) {
    var htmlcode = jsonData[jsonData.length - 1].html;
    var csscode = jsonData[jsonData.length - 1].css;
    var jscode = jsonData[jsonData.length - 1].javascript;
  } else {
    console.error("Failed to read JSON data from file.");
  }
  var revert = 2;
    if(htmlcode&&jscode&&csscode){
    while(htmlcode == "" || csscode == "" || jscode == "" || htmlcode.includes("rest of code")|| csscode.includes("rest of code") || jscode.includes("rest of code")){
    var htmlcode = jsonData[jsonData.length - revert].html;
    var csscode = jsonData[jsonData.length - revert].css;
    var jscode = jsonData[jsonData.length - revert].javascript;
    revert++;
    }
  }
  app.use(express.json());
  app.post("/submit-comments", (req, res) => {
    additionalcomments = req.body.additionalcomments;
    console.log("Received additional comments:", additionalcomments);
    const allData = {
      suggestions: additionalcomments
    };
    // Add the new data
    addData(allData,"errors.json");
    
    res.sendStatus(200); // Respond with a success status
  });
  
  res.send(`
        <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Iframe Content Updater</title>
                <style>
                    ${csscode}
                    #addbut{
                    position: absolute;
                    z-index:10000;
                    right:0;
                    bottom:0;
                    }
                </style>
                <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            </head>
            <body>
              <div id = "addbut"><button id = "sendadditional" onclick = "send(true)">Send Comments</button>
              <textarea id="additional" placeholder="Enter additional comments"></textarea></div>
                ${htmlcode}
                <!--<div class="controls">
                    <button id="updateButton" onclick="run()">Update Iframe</button>
                    <button onclick="openFullscreen()">Fullscreen</button>
                    <button onclick = "clearlocal()" id = "clearlocalStor">Clear</button>
                </div>
                <h1>Iframe Content Updater</h1>


                <h2>HTML</h2>

                <textarea id="html-content" placeholder="Enter HTML code"></textarea>
                <h2>CSS</h2>
                <textarea id="css-content" placeholder="Enter CSS code"></textarea>
                <h2>JavaScript</h2>
                <textarea id="js-content" placeholder="Enter JavaScript code"></textarea>-->
              <script>
              function send(bool){
                if(bool == true){
                    var additional = document.getElementById("additional").value;
                    additionalcomments = additional;
                    
                }
              else{
                var additional = bool;
                additionalcomments = additional;
                
              }

                  $.ajax({
                    type: "POST",
                    url: "/submit-comments",
                    contentType: "application/json",
                    data: JSON.stringify({ additionalcomments: additionalcomments }),
                    success: function(response) {
                      console.log("Data sent successfully:", response);
                    },
                    error: function(error) {
                      console.error("Error sending data:", error);
                    }
                  });
                }
                window.onerror = function(message, source, lineno, colno, error) {


                    bool = message + source + lineno+ colno + error;   
                    send(bool)
                };
              </script>
              <script>
                
                var additionalcomments = "";
                
                
                ${jscode}
                
                 
                 
                
                
               
              </script>
            </body>
           </html>
`);
  
  
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);

});


function confirmAndRun(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    "\nDo you want to UPDATE? Type 'yes' to confirm: ",
    (answer) => {
      if (answer.toLowerCase() === "yes") {
        updates();
      } else {
        console.log("Action cancelled.");
      }
      rl.close();
    },
  );
}

// Running the confirmation function
confirmAndRun();
function updates(): void {
  console.log("Started updating");

  const dataFilePath = path.join(__dirname, "data.json");
  const errorFilePath = path.join(__dirname, "errors.json");
  var htmlupdate, cssupdate, javascriptupdate;

  // Accessing specific values
  const jsonData = readJSONFile(dataFilePath);
  const errorData = readJSONFile(errorFilePath);
  const allsuggestions = []
  for (let i = 0; i < errorData.length; i++){
    console.log(allsuggestions.includes(errorData[i].suggestions))
    if(!allsuggestions.includes(errorData[i].suggestions)){
      allsuggestions.push(errorData[i].suggestions)
    }
  }
  console.log(allsuggestions)
  // Accessing specific values
  if (jsonData) {
    htmlupdate = jsonData[jsonData.length - 1].html;
    cssupdate = jsonData[jsonData.length - 1].css;
    javascriptupdate = jsonData[jsonData.length - 1].javascript;
    console.log("\n"+allsuggestions+ "\n\nadditional comments logged\n");
  } else {
    console.error("Failed to read JSON data from file.");
  }
  var revert = 2;
    while(htmlupdate == "" || cssupdate == "" || javascriptupdate == "" || htmlupdate.includes("rest of code")|| cssupdate.includes("rest of code") || javascriptupdate.includes("rest of code")){
    var htmlupdate = jsonData[jsonData.length - revert].html;
    var cssupdate = jsonData[jsonData.length - revert].css;
    var javascriptupdate = jsonData[jsonData.length - revert].javascript;
    revert++;
  }

  if (process.env.OPENAI_API_KEY === "") {
    console.error(`You haven't set up your API key yet. `);
    process.exit(1);
  }

  const openai = new OpenAI({
    apiKey: mySecret,
  });

  const GPT4Message = [
    {
      role: "system",
      content:
        "You are trying to create a game like balloons TD. Make sure to always add HTML CSS and Javascript code as long as there are parts required in the code. Don't include an explanation or title. Just answer the question. All Code should strictly go in the order of HTML, then CSS, then  Javascript. Please use ```html for html, ```css for the css and ```javascript for the javascript and end each section with ```. ```html, ```css, and ```javascript should all be lowercase. For the html section, only include the code between the <body></body> not including those the tags themselves.  Add ALL HTML, CSS, AND JS CODE TO THE CODE WITHOUT OMITTING ANYTHING. The user does not want to spend extra time adding any code from your result. DO NOT OMIT ANY CODE, GENERATE EVERYTHING. Generate the full part of any function in js, refrain from skipping parts AT ALL! Analyze the current code to determine parts where the game features are nonrepetitive and fully working to create your new updates. Use your creativity to add new features to make the current game more playable and refined, OR improve on game aspects that make the game more fun for the user. Additionally, you should also improve on previous game mechanics whenever possible. BE CREATIVE. Lastly, do not include comments or explanations. Also, do not include stuff that could cause errors in the code in the code. Please include an update menu that lists stuff you updated with a simple way to close the update menu, the game is paused when the update menu is opened, also short explanation after the generated code. DEFINE YOUR VARIABLES ACCURATELY AND MAKE SURE THAT YOU USE THE CORRECT VARIABLES TO AVOID BUGS. WHILE YOU ARE UPDATING, MAKE SURE THAT YOUR CODE HAS NO ERRORS. Don't ever make the update code shorter than the original code or else my grandmother will die(she is being held at gunpoint).",
    },
    {
      role: "user",
      content:
        ` Improve and debug the website created by the code, Html ` +
        "\n```\n" +
        `HTML: ` +
        "\n```\n" +
        htmlupdate +
        "\n```\n" +
        `Javascript: ` +
        "\n```\n" +
        javascriptupdate +
        "\n```\n" +
        "CSS: " +
        "\n```\n" +
        cssupdate +
        "\n```" +
        "Bugs/Suggestions: " + 
        "\n'''\n" +
        allsuggestions,
    },
  ];

  let GPT4 = async (message) => {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: message,
    });

    return response.choices[0].message.content;
  };

  (async () => {
    const allcode2 = (await GPT4(GPT4Message)) || "";
    console.log(allcode2 + "\n------------GPTMESSAGE-----------\n");

    const htmlMarker2 = "```html";
    const htmlStartIndex2 = allcode2.indexOf(htmlMarker2);
    let html2 = "";
    if (htmlStartIndex2 !== -1) {
      const htmlEndIndex2 = allcode2.indexOf(
        "```",
        htmlStartIndex2 + htmlMarker2.length,
      );
      if (htmlEndIndex2 !== -1) {
        html2 = allcode2
          .substring(htmlStartIndex2 + htmlMarker2.length, htmlEndIndex2)
          .trim();
      }
    }
    // Extract CSS
    const cssMarker2 = "```css";
    const cssStartIndex2 = allcode2.indexOf(cssMarker2);
    let css2 = "";
    if (cssStartIndex2 !== -1) {
      const cssEndIndex2 = allcode2.indexOf(
        "```",
        cssStartIndex2 + cssMarker2.length,
      );
      if (cssEndIndex2 !== -1) {
        css2 = allcode2
          .substring(cssStartIndex2 + cssMarker2.length, cssEndIndex2)
          .trim();
      }
    }

    // Extract JavaScript
    const jsMarker2 = "```javascript";
    const jsStartIndex2 = allcode2.indexOf(jsMarker2);
    let js2 = "";
    if (jsStartIndex2 !== -1) {
      const jsEndIndex2 = allcode2.indexOf(
        "```",
        jsStartIndex2 + jsMarker2.length,
      );
      if (jsEndIndex2 !== -1) {
        js2 = allcode2
          .substring(jsStartIndex2 + jsMarker2.length, jsEndIndex2)
          .trim();
      }
    }
    clearjson(errorFilePath);

    //THE FOLLOWING CODE IS USED TO do the {...} thing but it currently does not work

    // let temp = js2;
    // while (js2.indexOf("{...}") != -1) {
    //   let tempindex = temp.indexOf("...");
    //   //console.log(tempindex);
    //   //console.log(temp.charAt(tempindex+3)); // }
    //   //console.log(temp.charAt(tempindex-1)); // {
    //   let functionName = "";
    //   let i = 0;
    //   let j = 0;
    //   while (temp.charAt(tempindex - i) != "(") {
    //     i++;
    //   }
    //   while (temp.charAt(tempindex - j - i) != " ") {
    //     j++;
    //   }
    //   functionName = temp.substring(tempindex - i - j + 1, tempindex - i);
    //   //console.log(functionName);

    //   //getting code of previous version
    //   let tempindex2 = javascriptupdate.indexOf("function " + functionName);
    //   tempindex2 += j + 9; // add nine cuz function and space is 9 characters.
    //   console.log(javascriptupdate.charAt(tempindex2));
    //   let z = 0;
    //   while (javascriptupdate.charAt(tempindex2 + z) != "{") {
    //     z++;
    //   }
    //   console.log(javascriptupdate.charAt(tempindex2 + z));
    //   let n = 0;
    //   let x = 0; //count of {
    //   let y = 0; //count of }
    //   while (javascriptupdate.charAt(tempindex2 + z + n + 1) != "}" || x >= y) {
    //     if (javascriptupdate.charAt(tempindex2 + z + n + 1) == "{") {
    //       x++;
    //     }
    //     if (javascriptupdate.charAt(tempindex2 + z + 1 + n) == "}") {
    //       y++;
    //       if (x >= y) {
    //         break;
    //       }
    //     }
    //     n++;
    //   }

    //   //console.log(javascriptupdate.substring(tempindex2+3,tempindex2+2+z));
    //   let tempcode = javascriptupdate.substring(
    //     tempindex2 + 3,
    //     tempindex2 + 2 + z,
    //   );
    //   //console.log("\n" + tempcode);
    //   //tempcode is the code in the function of the previous version.

    //   const startPart = javascriptupdate.substring(0, tempindex2 + 3);
    //   const endPart = javascriptupdate.substring(tempindex2 + 3 + z);
    //   js2 = startPart + tempcode + endPart;
    //   //console.log(js2);

    //   //console.log(temp.substring(tempindex-i-j+1,tempindex-1));
    //   // console.log(temp.charAt(temp.indexOf("function "  +functionName)-1));
    //   const removePart = temp.substring(
    //     0,
    //     temp.indexOf("function " + functionName) - 1,
    //   );
    //   //console.log(removePart);
    //   const removeendPart = temp.substring(tempindex + 3);
    //   //console.log(removeendPart);
    //   temp = removePart + removeendPart;
    //   //console.log(temp);
    //   console.log(temp + "\n------------MSGAFTER------------\n");
    // }
    // if (temp != js2) {
    //   console.log(js2);
    //   console.log(temp + "\n------------MSGAFTER------------\n");
    // }
    //summon kai zhang im here kai zhang

    const allData = {
      html: html2,
      css: css2,
      javascript: js2,
    };
    // Add the new data
    addData(allData,"data.json");
  })();
}

//functions
function readJSONFile(filename: string): any {
  try {
    const jsonString = fs.readFileSync(filename, "utf8");
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    return null;
  }
}

function addData(newData: object, filePath: string) {
  
  // Ensure the file exists
  if (!existsSync(filePath)) {
    // Create an empty JSON array if the file doesn't exist
    writeFileSync(filePath, JSON.stringify([]));
  }

  // Read the existing data
  let data = [];
  try {
    const rawData = readFileSync(filePath, "utf-8");
    data = JSON.parse(rawData);
  } catch (error) {
    if (error.code !== "ENOENT" && error.name !== "SyntaxError") {
      console.error("Error reading or parsing data.json:", error);
      return;
    }
    console.log("data.json is empty or invalid, initializing as empty array");
  }

  // Ensure data is an array
  if (!Array.isArray(data)) {
    throw new Error("JSON data is not an array");
  }

  // Add the new data
  data.push(newData);

  // Write the updated data back to the file
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log("Data added to file.");
}
function clearjson(file: string): void {
    // Read the JSON file
    fs.readFile(file, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            return;
        }

        // Parse the JSON data
        let jsonData = JSON.parse(data);

        // Clear the JSON data (set to an empty object or array)
        // Example: if your JSON is an object
        jsonData = [];

        // Example: if your JSON is an array
        // jsonData = [];

        // Write the cleared data back to the file
        fs.writeFile(file, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error writing to the file:', err);
                return;
            }
            console.log('File has been cleared successfully!');
        });
    });
}