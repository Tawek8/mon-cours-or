// Présélectionner les champs de montants et de pourcentages au premier clic.
document.addEventListener('focusin', event => {
  if (event.target.matches('input[inputmode="decimal"]')) event.target.select();
});
