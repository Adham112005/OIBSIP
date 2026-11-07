const currentOperandElement = document.getElementById("current-operand");
const previousOperandElement = document.getElementById("previous-operand");
const numberButtons = document.querySelectorAll("[data-number]");
const operatorButtons = document.querySelectorAll("[data-operator]");
const actionButtons = document.querySelectorAll("[data-action]");

let currentOperand = "0";
let previousOperand = "";
let operation = null;
let shouldResetScreen = false;

function updateDisplay() {
  currentOperandElement.textContent = currentOperand;
  previousOperandElement.textContent = operation
    ? `${previousOperand} ${operation}`
    : "";
}

function appendNumber(number) {
  if (currentOperand === "Error") clearCalculator();
  if (shouldResetScreen) {
    currentOperand = "";
    shouldResetScreen = false;
  }
  if (number === "." && currentOperand.includes(".")) return;
  if (currentOperand === "0" && number !== ".") currentOperand = number;
  else currentOperand += number;
  updateDisplay();
}

function chooseOperation(nextOperation) {
  if (currentOperand === "Error") return;
  if (operation && !shouldResetScreen) calculate();
  previousOperand = currentOperand;
  operation = nextOperation;
  shouldResetScreen = true;
  updateDisplay();
}

function calculate() {
  if (!operation || shouldResetScreen) return;
  const first = Number(previousOperand);
  const second = Number(currentOperand);
  let result;

  switch (operation) {
    case "+": result = first + second; break;
    case "−": result = first - second; break;
    case "×": result = first * second; break;
    case "÷":
      if (second === 0) {
        currentOperand = "Cannot divide by zero";
        previousOperand = "";
        operation = null;
        shouldResetScreen = true;
        updateDisplay();
        return;
      }
      result = first / second;
      break;
    default: return;
  }

  currentOperand = formatResult(result);
  previousOperand = "";
  operation = null;
  shouldResetScreen = true;
  updateDisplay();
}

function formatResult(number) {
  if (!Number.isFinite(number)) return "Error";
  return String(Number(number.toPrecision(12)));
}

function clearCalculator() {
  currentOperand = "0";
  previousOperand = "";
  operation = null;
  shouldResetScreen = false;
  updateDisplay();
}

function deleteNumber() {
  if (shouldResetScreen || currentOperand === "Error") {
    currentOperand = "0";
    shouldResetScreen = false;
  } else {
    currentOperand = currentOperand.length > 1
      ? currentOperand.slice(0, -1)
      : "0";
  }
  updateDisplay();
}

function toggleSign() {
  if (currentOperand === "0" || currentOperand === "Error") return;
  currentOperand = currentOperand.startsWith("-")
    ? currentOperand.slice(1)
    : `-${currentOperand}`;
  updateDisplay();
}

function percentage() {
  if (currentOperand === "Error") return;
  currentOperand = formatResult(Number(currentOperand) / 100);
  updateDisplay();
}

numberButtons.forEach(button => {
  button.addEventListener("click", () => appendNumber(button.dataset.number));
});

operatorButtons.forEach(button => {
  button.addEventListener("click", () => chooseOperation(button.dataset.operator));
});

actionButtons.forEach(button => {
  button.addEventListener("click", () => {
    switch (button.dataset.action) {
      case "clear": clearCalculator(); break;
      case "delete": deleteNumber(); break;
      case "sign": toggleSign(); break;
      case "percent": percentage(); break;
      case "decimal": appendNumber("."); break;
      case "equals": calculate(); break;
    }
  });
});

document.addEventListener("keydown", event => {
  if (/^[0-9]$/.test(event.key)) appendNumber(event.key);
  else if (event.key === ".") appendNumber(".");
  else if (event.key === "+") chooseOperation("+");
  else if (event.key === "-") chooseOperation("−");
  else if (event.key === "*") chooseOperation("×");
  else if (event.key === "/") {
    event.preventDefault();
    chooseOperation("÷");
  }
  else if (event.key === "Enter" || event.key === "=") calculate();
  else if (event.key === "Backspace") deleteNumber();
  else if (event.key === "Escape") clearCalculator();
});

updateDisplay();
