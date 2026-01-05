// Mock for exceljs to avoid ESM import issues in Jest
module.exports = {
  Workbook: class Workbook {
    constructor() {
      this.worksheets = [];
    }
    addWorksheet(name) {
      const worksheet = {
        name,
        columns: [],
        addRow: jest.fn(),
        getRow: jest.fn(),
        getColumn: jest.fn(),
      };
      this.worksheets.push(worksheet);
      return worksheet;
    }
    async xlsx() {
      return {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock')),
      };
    }
  },
};
