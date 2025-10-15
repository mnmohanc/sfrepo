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

  // server baseline
  original = { email: '', phone: '', doNotCall: false, emailOptOut: false };

  // UI state
  email = '';
  phone = '';
  doNotCall = false;
  emailOptOut = false;

  // keep last non-suppressed values so unchecking restores them
  lastNonSuppressed = { email: '', phone: '' };

  // Hide component unless data is loaded and both flags are false
  get visible() {
    return this.loaded && !(this.doNotCall || this.emailOptOut);
  }

  @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
  wiredContact({ data, error }) {
    if (data) {
      this.original = {
        email: data.fields.Email.value || '',
        phone: data.fields.Phone.value || '',
        doNotCall: data.fields.DoNotCall.value || false,
        emailOptOut: data.fields.HasOptedOutOfEmail.value || false
      };

      this.email = this.original.email;
      this.phone = this.original.phone;
      this.doNotCall = this.original.doNotCall;
      this.emailOptOut = this.original.emailOptOut;

      this.lastNonSuppressed.email = this.original.email;
      this.lastNonSuppressed.phone = this.original.phone;

      this.enforceBusinessRules();
      this.loaded = true;
    } else if (error) {
      this.loaded = true;
      this.toast('Error loading contact', this.friendlyError(error), 'error');
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

    if (name === 'Email') {
      this.email = (value || '').trim();
      if (!this.emailOptOut) this.lastNonSuppressed.email = this.email;
    }
    if (name === 'Phone') {
      this.phone = (value || '').trim();
      if (!this.doNotCall) this.lastNonSuppressed.phone = this.phone;
    }
  }

  handleToggle(event) {
    const { name, checked } = event.target;

    if (name === 'DoNotCall') {
      this.doNotCall = checked;
      if (this.doNotCall) {
        this.lastNonSuppressed.phone = this.phone;
        this.phone = '';
      } else {
        this.phone = this.lastNonSuppressed.phone || '';
      }
    }

    if (name === 'HasOptedOutOfEmail') {
      this.emailOptOut = checked;
      if (this.emailOptOut) {
        this.lastNonSuppressed.email = this.email;
        this.email = '';
      } else {
        this.email = this.lastNonSuppressed.email || '';
      }
    }
  }

  enforceBusinessRules() {
    if (this.doNotCall) this.phone = '';
    else this.phone = this.phone || this.lastNonSuppressed.phone || '';

    if (this.emailOptOut) this.email = '';
    else this.email = this.email || this.lastNonSuppressed.email || '';
  }

  async handleSave() {
    try {
      const fields = {};
      fields[CONTACT_ID.fieldApiName] = this.recordId;
      fields[CONTACT_EMAIL.fieldApiName] = this.email || null;
      fields[CONTACT_PHONE.fieldApiName] = this.phone || null;
      fields[CONTACT_DNC.fieldApiName] = this.doNotCall;
      fields[CONTACT_EMAIL_OPTOUT.fieldApiName] = this.emailOptOut;

      await updateRecord({ fields });

      this.original = {
        email: this.email,
        phone: this.phone,
        doNotCall: this.doNotCall,
        emailOptOut: this.emailOptOut
      };

      // refresh backups
      this.lastNonSuppressed.email = this.email || this.lastNonSuppressed.email;
      this.lastNonSuppressed.phone = this.phone || this.lastNonSuppressed.phone;

      this.toast('Saved', 'Contact updated successfully.', 'success');
    } catch (e) {
      this.toast('Save failed', this.friendlyError(e), 'error');
    }
  }

  handleReset() {
    this.email = this.original.email;
    this.phone = this.original.phone;
    this.doNotCall = this.original.doNotCall;
    this.emailOptOut = this.original.emailOptOut;

    this.lastNonSuppressed.email = this.original.email;
    this.lastNonSuppressed.phone = this.original.phone;

    this.enforceBusinessRules();
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant, mode: 'pester' }));
  }

  friendlyError(error) {
    try {
      return error?.body?.message || error?.message || 'Unknown error';
    } catch {
      return 'Unknown error';
    }
  }
}
