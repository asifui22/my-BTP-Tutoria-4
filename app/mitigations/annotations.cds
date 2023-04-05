using RiskService as service from '../../srv/risk-service';


annotate service.Mitigations with @odata.draft.enabled;

annotate service.Mitigations with @(
    UI.LineItem #Mitigations : [
        {
            $Type : 'UI.DataField',
            Value : ID,
        },{
            $Type : 'UI.DataField',
            Value : description,
        
        },{
            $Type : 'UI.DataField',
            Value : owner,
        },{
            $Type : 'UI.DataField',
            Value : timeline,
        },

    ]
);
