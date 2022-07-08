"use strict";
require("dotenv").config();
const path = require("path");
const express = require("express");
const app = express();
const puppeteer = require("puppeteer");
const fs = require("fs/promises");
const cors = require("cors");
const cp = require("child_process");

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"));
});
app.post("/", async (req, res) => {
    console.log(req.body);
    await extract(req.body.start, req.body.end, req.body.search, req.body.show);
});

app.listen(4000, () => console.log("server started at port 4000"));

const extract = async (start, end, search = "", show) => {
    console.log("extracting please wait..");
    let dateFrom = start;
    let dateTo = end;
    /* This is the code for opening the browser and creating a new page. */
    const browser = await puppeteer.launch({
        headless: !show,
    });
    const page = await browser.newPage();

    /* Opening the URL in the browser. */
    console.log("Opening the URL in the browser..");
    await page.goto(`https://unifi-logviewer.revlv.com`);

    /* This is the code for logging in to the website. */
    console.log("inputting credentials..");
    await page.type("#inputUserName", process.env.USER, { delay: 100 });
    await page.type("#inputPassword", process.env.PASS);
    await page.click("button[type='submit']");
    await page.waitForTimeout(500);

    /* This is the code for selecting the controller. */
    console.log("navigating to controller..");
    await page.click("#navbar_controller_dropdown_link");
    await page.click("#controller_1");
    await page.waitForTimeout(500);

    /* This is the code for selecting the report. */
    await page.click("#report_dropdown");
    await page.click("a[data-method='downtime_report']");
    await page.waitForTimeout(500);

    /* This is the code for selecting the date range. */
    console.log("resetting fields..");
    await page.evaluate(() => {
        document.getElementById("min").value = "";
        document.getElementById("max").value = "";
    });

    console.log("inputting parameters..");
    await page.type("#min", dateFrom);
    await page.type("#max", dateTo);
    await page.click("body");
    await page.type("input[type='search']", search);
    await page.select("select[name='reports-alarm-table_length']", "-1");

    /* This is the code for getting the logs from the website. */
    console.log("collecting data from table..");
    await page.waitForTimeout(4000);
    const data = await page.evaluate(() => {
        let count = 0;
        const th = Array.from(document.querySelectorAll("th")).map((e) => e.textContent);
        const td = Array.from(document.querySelectorAll("td")).map((e) => {
            return e.textContent;
        });

        return { th, td };
    });

    console.log(data.th);
    await fs.writeFile("logs.txt", data.td.join("\n"));
    await browser.close();
    console.log(__dirname);
    cp.exec(`start "" "${__dirname}\\logs.txt"`);
};
