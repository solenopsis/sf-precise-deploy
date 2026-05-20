<?xml version="1.0" encoding="UTF-8"?>
<Workflow xmlns="http://soap.sforce.com/2006/04/metadata">
    <alerts>
        <fullName>Email_On_Creation</fullName>
        <description>Send email when account is created</description>
        <protected>false</protected>
        <recipients>
            <type>accountOwner</type>
        </recipients>
        <senderType>CurrentUser</senderType>
        <template>unfiled$public/AccountCreated</template>
    </alerts>
    <alerts>
        <fullName>Old_Email_Alert</fullName>
        <description>Old alert to be removed</description>
        <protected>false</protected>
        <recipients>
            <type>accountOwner</type>
        </recipients>
        <senderType>CurrentUser</senderType>
        <template>unfiled$public/OldTemplate</template>
    </alerts>
    <fieldUpdates>
        <fullName>Set_Status_Active</fullName>
        <field>Status__c</field>
        <literalValue>Active</literalValue>
        <name>Set Status to Active</name>
    </fieldUpdates>
    <rules>
        <fullName>New_Account_Rule</fullName>
        <actions>
            <name>Email_On_Creation</name>
            <type>Alert</type>
        </actions>
        <actions>
            <name>Set_Status_Active</name>
            <type>FieldUpdate</type>
        </actions>
        <active>true</active>
        <criteriaItems>
            <field>Account.CreatedDate</field>
            <operation>equals</operation>
            <value>TODAY</value>
        </criteriaItems>
        <triggerType>onCreateOnly</triggerType>
    </rules>
    <rules>
        <fullName>Old_Rule</fullName>
        <active>false</active>
        <criteriaItems>
            <field>Account.Name</field>
            <operation>equals</operation>
            <value>Test</value>
        </criteriaItems>
        <triggerType>onAllChanges</triggerType>
    </rules>
</Workflow>
