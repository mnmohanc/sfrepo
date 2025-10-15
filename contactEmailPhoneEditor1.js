// ...imports unchanged...

export default class ContactEmailPhoneEditor extends LightningElement {
  @api recordId;

  loaded = false;

  // what came from the server
  original = { email: '', phone: '', doNotCall: false, emailOptOut: false };

  // what is currently in the UI
  email = '';
  phone = '';
  doNotCall = false;
  emailOptOut = false;

  // NEW: last values when not suppressed, so we can restore after unchecking
  lastNonSuppressed = { email: '', phone: '' };

  @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
  wiredContact({ data, error }) {
    if (data) {
      this.original = {
        email: data.fields.Email.value || '',
        phone: data.fields.Phone.value || '',
        doNotCall: data.fields.DoNotCall.value || false,
        emailOptOut: data.fields.HasOptedOutOfEmail.value || false
      };

      // working copy
      this.email = this.original.email;
      this.phone = this.original.phone;
      this.doNotCall = this.original.doNotCall;
      this.emailOptOut = this.original.emailOptOut;

      // initialize backups with what we loaded
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
      // only update backup if email isn’t currently suppressed
      if (!this.emailOptOut) this.lastNonSuppressed.email = this.email;
    }
    if (name === 'Phone') {
      this.phone = (value || '').trim();
      // only update backup if phone isn’t currently suppressed
      if (!this.doNotCall) this.lastNonSuppressed.phone = this.phone;
    }
  }

  handleToggle(event) {
    const { name, checked } = event.target;

    if (name === 'DoNotCall') {
      this.doNotCall = checked;

      if (this.doNotCall) {
        // going from OFF -> ON: remember what user had and clear field
        this.lastNonSuppressed.phone = this.phone;
        this.phone = '';
      } else {
        // going from ON -> OFF: restore what we remembered
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

  // Keep this for safety if other code paths call it
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

      // update baselines
      this.original = {
        email: this.email,
        phone: this.phone,
        doNotCall: this.doNotCall,
        emailOptOut: this.emailOptOut
      };
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

    // refresh backups from baseline
    this.lastNonSuppressed.email = this.original.email;
    this.lastNonSuppressed.phone = this.original.phone;

    this.enforceBusinessRules();
  }

  // toast + friendlyError unchanged...
}
