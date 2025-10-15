import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

import DO_NOT_CALL from '@salesforce/schema/Contact.DoNotCall';
import EMAIL_OPTOUT from '@salesforce/schema/Contact.HasOptedOutOfEmail';

const FIELDS = [DO_NOT_CALL, EMAIL_OPTOUT];

export default class ContactFlagsReader extends LightningElement {
  @api recordId;

  @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
  contact;

  get doNotCall() {
    return getFieldValue(this.contact.data, DO_NOT_CALL) || false;
  }
  get emailOptOut() {
    return getFieldValue(this.contact.data, EMAIL_OPTOUT) || false;
  }
  get loaded() {
    return !!this.contact?.data || !!this.contact?.error;
  }
}
