import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export function createShippingRule(json = {}) {
  return {
    areaName: json.area_name?.toString() ?? json.areaName?.toString() ?? 'Unknown Area',
    charge: json.charge?.toString() ?? '60',
    contactNumber: json.contact_number?.toString() ?? json.contactNumber?.toString() ?? '',
    codInstructions: json.COD_instructions?.toString() ?? json.codInstructions?.toString() ?? '',
    bKashInstructions: json.bKash_instructions?.toString() ?? json.bKashInstructions?.toString() ?? '',
    nagadInstructions: json.Nagad_instructions?.toString() ?? json.nagadInstructions?.toString() ?? '',
    rocketInstructions: json.Rocket_instructions?.toString() ?? json.rocketInstructions?.toString() ?? '',
  };
}

export async function fetchShippingRules() {
  const snap = await getDocs(collection(db, 'paymentDetails'));
  return snap.docs
    .map(docSnap => createShippingRule(docSnap.data()))
    .sort((a, b) => a.areaName.localeCompare(b.areaName));
}

export function getPaymentInstructions(rule, method) {
  if (!rule) {
    return '';
  }

  if (method === 'cod') {
    return rule.codInstructions;
  }

  if (method === 'bkash') {
    return rule.bKashInstructions;
  }

  if (method === 'nagad') {
    return rule.nagadInstructions;
  }

  if (method === 'rocket') {
    return rule.rocketInstructions;
  }

  return '';
}
