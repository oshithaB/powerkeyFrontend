declare module 'pdfmake/build/pdfmake' {
  const content: any;
  export default content;
}

declare module 'pdfmake/build/vfs_fonts' {
  const content: any;
  export default content;
}

export interface Cheque {
  id: number;
  cheque_number: string;
  bank_name: string;
  branch_name: string;
  cheque_date: string;
  payee_name: string;
  amount: number;
  status: 'pending' | 'deposited' | 'returned';
  created_at: string;
}
