import {useLocalData,updateLocal,localDate} from './localStore';
export type TransferRecord = {
  id: string;
  code?: string;
  sequence?: number;
  direction: "outgoing" | "incoming";
  date: string;
  sender: string;
  recipient: string;
  senderPhone: string;
  recipientPhone: string;
  senderAddress: string;
  recipientAddress: string;
  amount: number;
  currency: string;
  commission: number;
  office: string;
  status: string;
  notes: string;
  reason: string;
  voucher: string;
  deliveredAt: string;
};
export const demoDay=localDate().slice(0,10);
export const outgoingStatuses = ["مسلمة", "معلقة", "قيد المعالجة", "ملغاة"];
export const incomingStatuses = [
  "بانتظار التسليم",
  "مسلمة",
  "قيد المراجعة",
  "ملغاة",
  "معلقة",
  "قيد المعالجة",
];

export const offices:string[]=[];
export function useTransferRecords(){return useLocalData().transfers;}
export function saveTransfer(record:TransferRecord){return updateLocal(data=>({...data,transfers:data.transfers.some(r=>r.id===record.id)?data.transfers.map(r=>r.id===record.id?record:r):[record,...data.transfers]}));}
export function updateTransfer(id:string,patch:Partial<TransferRecord>){return updateLocal(data=>({...data,transfers:data.transfers.map(r=>r.id===id?{...r,...patch}:r)}));}
