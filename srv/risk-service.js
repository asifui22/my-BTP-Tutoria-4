
const cds = require('@sap/cds')

/**
 * Implementation for Risk Management service defined in ./risk-service.cds
 */
module.exports = cds.service.impl(async function () {
    //{To solve this issue, you add some handler code to delegate the call from the Suppliers service entity to the remote API_BUSINESS_PARTNER service.
    const bupa = await cds.connect.to('API_BUSINESS_PARTNER');
    this.on('READ', 'Suppliers', async req => {
        return bupa.run(req.query);
    });
    //}
    this.after('READ', 'Risks', risksData => {
        const risks = Array.isArray(risksData) ? risksData : [risksData];
        risks.forEach(risk => {
            if (risk.impact >= 100000) {
                risk.criticality = 1;
            } else {
                risk.criticality = 2;
            }
        });
    });
    // Risks?$expand=supplier    ( following code to handle the expands for supplier data of Risks --> The code first makes sure an expand for a supplier is requested. 
    //Then, the expand is removed from the query because it can’t be handled by the CAP server generically.

    //To identify the suppliers that are needed, the risks are read by calling next(). 
    //This way, all following handlers are called, including the built-in CAP handler that reads the risks from the database and returns them. 
    //The code makes sure that the required supplier_ID field is returned.
    //All the required suppliers are read with one request from API_BUSINESS_PARTNER service and added to the respective risks.)
    this.on("READ", 'Risks', async (req, next) => {
        if (!req.query.SELECT.columns) return next();
        const expandIndex = req.query.SELECT.columns.findIndex(
            ({ expand, ref }) => expand && ref[0] === "supplier"
        );
        if (expandIndex < 0) return next();

        // Remove expand from query
        req.query.SELECT.columns.splice(expandIndex, 1);

        // Make sure supplier_ID will be returned
        if (!req.query.SELECT.columns.indexOf('*') >= 0 &&
            !req.query.SELECT.columns.find(
                column => column.ref && column.ref.find((ref) => ref == "supplier_ID"))
        ) {
            req.query.SELECT.columns.push({ ref: ["supplier_ID"] });
        }

        const risks = await next();

        const asArray = x => Array.isArray(x) ? x : [x];

        // Request all associated suppliers
        const supplierIds = asArray(risks).map(risk => risk.supplier_ID);
        const suppliers = await bupa.run(SELECT.from('RiskService.Suppliers').where({ ID: supplierIds }));

        // Convert in a map for easier lookup
        const suppliersMap = {};
        for (const supplier of suppliers)
            suppliersMap[supplier.ID] = supplier;

        // Add suppliers to result
        for (const note of asArray(risks)) {
            note.supplier = suppliersMap[note.supplier_ID];
        }

        return risks;
    });

});
