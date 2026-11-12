-- Application and travelers are saved together; caller's RLS and existing price trigger still apply.
create function public.submit_visa_request(request_id uuid, application jsonb, travelers jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.visa_applications; t jsonb; n integer;
begin
 if auth.uid() is null then raise exception 'Sign in before submitting'; end if;
 select * into a from public.visa_applications where id=request_id and user_id=auth.uid();
 if found then return jsonb_build_object('id',a.id,'reference',a.reference,'price_usd',a.price_usd,'status',a.status); end if;
 if jsonb_typeof(travelers)<>'array' then raise exception 'Travelers must be an array'; end if;
 n:=jsonb_array_length(travelers);
 if n<1 or n>10 then raise exception 'Use 1 to 10 travelers'; end if;
 if (application->>'travel_date')::date<current_date then raise exception 'Departure date cannot be in the past'; end if;
 for t in select value from jsonb_array_elements(travelers) loop
  if length(trim(t->>'first_name'))<1 or length(trim(t->>'last_name'))<1 or nullif(t->>'nationality','') is null or nullif(t->>'date_of_birth','') is null or (t->>'date_of_birth')::date>current_date then raise exception 'Check all traveler details and dates of birth'; end if;
 end loop;
 insert into public.visa_applications(id,user_id,visa_product_id,passport_country,residence_country,destination_country,purpose,contact_email,contact_phone,applicant_count,travel_date,notes)
 values(request_id,auth.uid(),application->>'visa_product_id',application->>'passport_country',application->>'residence_country',application->>'destination_country',application->>'purpose',application->>'contact_email',application->>'contact_phone',n,nullif(application->>'travel_date','')::date,application->>'notes') returning * into a;
 for t in select value from jsonb_array_elements(travelers) loop
  insert into public.visa_travelers(application_id,first_name,last_name,nationality,date_of_birth,gender,city,address)
  values(a.id,trim(t->>'first_name'),trim(t->>'last_name'),t->>'nationality',(t->>'date_of_birth')::date,nullif(t->>'gender',''),nullif(t->>'city',''),nullif(t->>'address',''));
 end loop;
 return jsonb_build_object('id',a.id,'reference',a.reference,'price_usd',a.price_usd,'status',a.status);
end;$$;
revoke all on function public.submit_visa_request(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.submit_visa_request(uuid,jsonb,jsonb) to authenticated;
