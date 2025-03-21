const fs = require('fs');
const puppeteer = require('puppeteer');
const sql = require('mssql');

const config = {
    user: 'User_EssvNew_ReadWriteExecute_EssvNew',
    password: '8R6976ew4unetQlK0N15KKPoeeAU3CtI',
    server: 'uk-uks-powerapps-001-dbs.database.windows.net',
    database: 'UK-UKS-POWERAPPS-001-DB',
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

(async () => {
    try {
        await sql.connect(config);
        console.log("Connected to database!");


        // Fetch Visit Details
        const visitResult = await sql.query(`
            SELECT ProjectTitle, ProjectOU, CreatedByName, CreatedOn FROM [EssvNew].[Visit] WHERE VisitID = 77
        `);
        const visit = visitResult.recordset[0];

        // Fetch Observations
        const obsResult = await sql.query(`
            SELECT Type, Category, Title, Description, CreatedByName FROM [EssvNew].[Observation] WHERE VisitID = 77
        `);
        const observations = obsResult.recordset;

        // Fetch Visitors and Representatives
        const visitorResult = await sql.query(`
            SELECT VisitorName, VisitorTitle FROM [EssvNew].[Visitor] WHERE VisitID = 77
            `);

        const visitors = visitorResult.recordset;
        
        const repResult = await sql.query(`
            SELECT RepName, RepTitle FROM [EssvNew].[Representative] WHERE VisitID = 77
            `);

        const representatives = repResult.recordset;


        // Load and Process HTML Template
        let htmlContent = fs.readFileSync('template.html', 'utf8');

        // Insert Static Data
        htmlContent = htmlContent
            .replaceAll('{{siteName}}', visit.ProjectTitle)
            .replace('{{date}}', new Date(visit.CreatedOn).toLocaleDateString())
            .replace('{{conductedBy}}', visit.CreatedByName)
            .replace('{{observationCount}}', observations.length);

        // Insert Dynamic Visitors
        const visitorLines = visitors.map(visitor => `
            <h4>${visitor.VisitorName}</h4>
            <p>${visitor.VisitorTitle}</p>
        `).join('');

        htmlContent = htmlContent.replace('{{visitors}}', visitorLines);

        // Insert Dynamic Observations
        const observationPages = observations.map((obs, index) => `
            <div class="page-break"></div>
            <div class="container">
                <h2>Observation ${index + 1}</h2>
                <p><strong>Category:</strong> ${obs.Type}</p>
                <p><strong>Details:</strong> ${obs.Category}</p>
                <p><strong>Details:</strong> ${obs.Title}</p>
                <p><strong>Details:</strong> ${obs.Description}</p>
                <p><strong>Details:</strong> ${obs.CreatedByName}</p>
            </div>
        `).join('');

        htmlContent = htmlContent.replace('{{observations}}', observationPages);

        // Generate PDF
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await page.pdf({ path: 'report1.pdf', format: 'A4' });

        await browser.close();
        console.log("PDF Generated: report.pdf");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        sql.close();
    }
})();
