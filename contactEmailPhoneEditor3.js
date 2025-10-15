import { LightningElement, api, wire } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import CONTACT_ID from '@salesforce/schema/Contact.Id';
import CONTACT_EMAIL from '@salesforce/schema/Contact.Email';
import CONTACT_PHONE from '@salesforce/schema/Contact.Phone';
import CONTACT_DNC from '@salesforce/schema/Contact.DoNotCall';
import CONTACT_EMAIL_OPTOUT from '@salesforce/schema/Contact.HasOptedOutOfEmail';

const FIELDS = [CONTACT_ID, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_DNC, CONTACT_EMAIL_OPTOUT];

export default class ContactEmailPhoneEditor extends LightningElement {
  @api recordId;
  loaded = false;

  email = '';
  phone = '';
  doNotCall = false;
  emailOptOut = false;
  original = {};

  @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
  wiredContact({ data, error }) {
    if (data) {
      this.email = data.fields.Email.value || '';
      this.phone = data.fields.Phone.value || '';
      this.doNotCall = data.fields.DoNotCall.value || false;
      this.emailOptOut = data.fields.HasOptedOutOfEmail.value || false;

      this.original = {
        email: this.email,
        phone: this.phone,
        doNotCall: this.doNotCall,
        emailOptOut: this.emailOptOut
      };
      this.loaded = true;
    } else if (error) {
      this.loaded = true;
      this.toast('Error', this.friendlyError(error), 'error');
    }
  }

  get saveDisabled() {
    return (
      this.email === this.original.email &&
      this.phone === this.original.phone &&
      this.doNotCall === this.original.doNotCall &&
      this.emailOptOut === this.original.emailOptOut
    );
  }

  handleChange(event) {
    const { name, value } = event.target;
    if (name === 'Email') this.email = value;
    if (name === 'Phone') this.phone = value;
  }

  handleToggle(event) {
    const { name, checked } = event.target;
    if (name === 'DoNotCall') this.doNotCall = checked;
    if (name === 'HasOptedOutOfEmail') this.emailOptOut = checked;
  }

  async handleSave() {
    try {
      const fields = {};
      fields[CONTACT_ID.fieldApiName] = this.recordId;
      fields[CONTACT_EMAIL.fieldApiName] = this.emailOptOut ? null : this.email;
      fields[CONTACT_PHONE.fieldApiName] = this.doNotCall ? null : this.phone;
      fields[CONTACT_DNC.fieldApiName] = this.doNotCall;
      fields[CONTACT_EMAIL_OPTOUT.fieldApiName] = this.emailOptOut;

      await updateRecord({ fields });
      this.toast('Success', 'Contact updated successfully', 'success');
    } catch (error) {
      this.toast('Error', this.friendlyError(error), 'error');
    }
  }

  handleReset() {
    this.email = this.original.email;
    this.phone = this.original.phone;
    this.doNotCall = this.original.doNotCall;
    this.emailOptOut = this.original.emailOptOut;
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }

  friendlyError(error) {
    return error?.body?.message || error?.message || 'Unknown error';
  }
}
