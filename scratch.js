const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const modals = [
  'BankModal', 'TxnModal', 'TxnEditModal', 'FDModal', 'RDModal', 'BondModal', 
  'PPFModal', 'NPSModal', 'MFModal', 'LICModal', 'TermModal', 'DematModal', 
  'StockModal', 'CCModal', 'PrepaidModal', 'LoanTakenModal', 'LoanGivenModal', 
  'SubModal', 'GoalModal', 'IncomeModal', 'TaxPmtModal', 'BudgetModal', 'SIPModal'
];

modals.forEach(m => {
  const modalRegex = new RegExp(`(function ${m}\\([^)]+\\) \\{[\\s\\S]*?<Modal[^>]*>)`, 'g');
  
  code = code.replace(modalRegex, (match) => {
    // Check if owner dropdown is already added
    if (match.includes('label="Owner / Profile"')) return match;
    
    const ownerField = `\n      <Field label="Owner / Profile">\n        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>\n          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}\n        </select>\n      </Field>`;
    return match + ownerField;
  });
});

fs.writeFileSync('src/App.tsx', code);
console.log('Modals updated');
